import { Router } from "express";
import { z } from "zod";
import { blendedScore, MILESTONES } from "@borewell/shared";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../auth";
import { distanceKm, genBookingCode, genRequestCode } from "../util/codes";
import { createOrder, verifyPaymentSignature } from "../services/razorpay";
import { env } from "../env";

export const customerRouter = Router();
customerRouter.use(requireAuth("customer"));

const requestSchema = z.object({
  district: z.string().min(1),
  mandal: z.string().min(1),
  landType: z.enum(["Agriculture", "Residential", "Commercial"]),
  depthFt: z.coerce.number().int().positive(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  preferredDate: z.coerce.date().optional(),
});

customerRouter.post("/requests", async (req: AuthedRequest, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const request = await prisma.borewellRequest.create({
    data: {
      ...parsed.data,
      preferredDate: parsed.data.preferredDate ?? new Date(Date.now() + 7 * 86400000),
      code: genRequestCode(),
      customerId: req.auth!.sub,
    },
  });
  res.status(201).json(request);
});

customerRouter.get("/requests", async (req: AuthedRequest, res) => {
  const requests = await prisma.borewellRequest.findMany({
    where: { customerId: req.auth!.sub },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { quotes: true } } },
  });
  res.json(
    requests.map((r) => ({ ...r, quoteCount: r._count.quotes, _count: undefined }))
  );
});

/** Ranked quotes for a request — blended price+rating+distance score, best first. */
customerRouter.get("/requests/:id/quotes", async (req: AuthedRequest, res) => {
  const request = await prisma.borewellRequest.findFirst({
    where: { id: req.params.id, customerId: req.auth!.sub },
  });
  if (!request) return res.status(404).json({ error: "Request not found" });

  const quotes = await prisma.quote.findMany({
    where: { requestId: request.id },
    include: { company: true },
  });

  const ranked = quotes
    .map((q) => {
      const dist = distanceKm(request.lat, request.lng, q.company.baseLat, q.company.baseLng);
      return {
        id: q.id,
        requestId: q.requestId,
        companyId: q.companyId,
        companyName: q.company.name,
        pricePerFt: q.pricePerFt,
        machineType: q.machineType,
        estimatedCompletion: q.estimatedCompletion,
        rating: q.company.ratingAvg,
        distanceKm: dist,
        yearsExperience: q.company.experienceYears,
        blendedScore: blendedScore({ rating: q.company.ratingAvg, price: q.pricePerFt, distanceKm: dist }),
      };
    })
    .sort((a, b) => b.blendedScore - a.blendedScore)
    .map((q, i) => ({ ...q, rank: i + 1, isTop: i === 0 }));

  res.json(ranked);
});

/** Book a quote: creates the booking (contact details stay hidden until fee is paid). */
customerRouter.post("/quotes/:quoteId/book", async (req: AuthedRequest, res) => {
  const quote = await prisma.quote.findUnique({
    where: { id: req.params.quoteId },
    include: { request: true, booking: true },
  });
  if (!quote || quote.request.customerId !== req.auth!.sub) {
    return res.status(404).json({ error: "Quote not found" });
  }
  if (quote.request.status !== "OPEN") return res.status(409).json({ error: "Request already booked" });

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        code: genBookingCode(),
        requestId: quote.requestId,
        quoteId: quote.id,
        customerId: req.auth!.sub,
        companyId: quote.companyId,
        pricePerFt: quote.pricePerFt,
      },
    });
    await tx.borewellRequest.update({ where: { id: quote.requestId }, data: { status: "BOOKED" } });
    await tx.milestone.createMany({
      data: MILESTONES.map((label, order) => ({ bookingId: b.id, label, order })),
    });
    return b;
  });

  res.status(201).json(booking);
});

/** Create Razorpay order for the ₹500 booking fee. */
customerRouter.post("/bookings/:id/pay/order", async (req: AuthedRequest, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, customerId: req.auth!.sub },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.status !== "CONFIRMED") return res.status(409).json({ error: "Booking fee already paid" });

  const order = await createOrder(booking.bookingFee, booking.code);
  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: { orderId: order.orderId, status: "CREATED" },
    create: { bookingId: booking.id, orderId: order.orderId, amount: booking.bookingFee },
  });

  res.json({ ...order, mock: env.razorpayMock });
});

const verifyPaySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

/** Verify Razorpay payment signature; on success unlock company contact details. */
customerRouter.post("/bookings/:id/pay/verify", async (req: AuthedRequest, res) => {
  const parsed = verifyPaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, customerId: req.auth!.sub },
    include: { payment: true },
  });
  if (!booking || !booking.payment) return res.status(404).json({ error: "Booking not found" });

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;
  if (
    razorpayOrderId !== booking.payment.orderId ||
    !verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
  ) {
    await prisma.payment.update({ where: { id: booking.payment.id }, data: { status: "FAILED" } });
    return res.status(400).json({ error: "Payment verification failed" });
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: booking.payment.id },
      data: { status: "PAID", paymentId: razorpayPaymentId },
    }),
    prisma.booking.update({ where: { id: booking.id }, data: { status: "PAID" } }),
    prisma.milestone.updateMany({
      where: { bookingId: booking.id, order: 0 },
      data: { completedAt: new Date() },
    }),
  ]);

  res.json({ ok: true });
});

/** Booking detail — company contact revealed only after payment. */
customerRouter.get("/bookings/:id", async (req: AuthedRequest, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, customerId: req.auth!.sub },
    include: {
      company: true,
      milestones: { orderBy: { order: "asc" } },
      workUpdates: { orderBy: { createdAt: "asc" } },
      invoice: true,
      review: true,
      payment: true,
    },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const paid = booking.status !== "CONFIRMED";
  res.json({
    id: booking.id,
    code: booking.code,
    status: booking.status,
    pricePerFt: booking.pricePerFt,
    bookingFee: booking.bookingFee,
    createdAt: booking.createdAt,
    company: {
      id: booking.company.id,
      name: booking.company.name,
      city: booking.company.city,
      state: booking.company.state,
      experienceYears: booking.company.experienceYears,
      machineType: booking.company.machineType,
      // Contact details only shared after the booking fee is paid.
      phone: paid ? booking.company.phone : null,
    },
    milestones: booking.milestones.map((m) => ({ label: m.label, completedAt: m.completedAt })),
    workUpdates: booking.workUpdates,
    invoice: booking.invoice,
    review: booking.review,
  });
});

customerRouter.get("/bookings", async (req: AuthedRequest, res) => {
  const bookings = await prisma.booking.findMany({
    where: { customerId: req.auth!.sub },
    orderBy: { createdAt: "desc" },
    include: { company: { select: { name: true } } },
  });
  res.json(
    bookings.map((b) => ({
      id: b.id,
      code: b.code,
      companyName: b.company.name,
      status: b.status,
      createdAt: b.createdAt,
    }))
  );
});

const reviewSchema = z.object({ rating: z.coerce.number().int().min(1).max(5), text: z.string().max(2000).optional() });

customerRouter.post("/bookings/:id/review", async (req: AuthedRequest, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, customerId: req.auth!.sub },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const review = await prisma.review.upsert({
    where: { bookingId: booking.id },
    update: { rating: parsed.data.rating, text: parsed.data.text ?? "" },
    create: { bookingId: booking.id, rating: parsed.data.rating, text: parsed.data.text ?? "" },
  });

  // Refresh the company's average rating.
  const agg = await prisma.review.aggregate({
    where: { booking: { companyId: booking.companyId } },
    _avg: { rating: true },
  });
  if (agg._avg.rating != null) {
    await prisma.company.update({
      where: { id: booking.companyId },
      data: { ratingAvg: Math.round(agg._avg.rating * 10) / 10 },
    });
  }

  res.status(201).json(review);
});

/** Invoice: generated when the company completes work; fetched here. */
customerRouter.get("/bookings/:id/invoice", async (req: AuthedRequest, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { booking: { id: req.params.id, customerId: req.auth!.sub } },
  });
  if (!invoice) return res.status(404).json({ error: "Invoice not available yet" });
  res.json(invoice);
});
