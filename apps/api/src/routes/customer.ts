import { Router } from "express";
import { z } from "zod";
import { blendedScore, computeTotalFromBands, MACHINE_TYPES, MAX_DEPTH_FT, MILESTONES } from "@borewell/shared";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../auth";
import { distanceKm, genBookingCode, genRequestCode } from "../util/codes";
import { companyServiceAreaFilter, isSameCalendarDay } from "../util/matching";
import { createOrder, verifyPaymentSignature } from "../services/razorpay";
import { recordMandal, recordVillage } from "../services/locationSuggestions";
import { env } from "../env";

export const customerRouter = Router();
customerRouter.use(requireAuth("customer"));

// ---- Profile ----

customerRouter.get("/profile", async (req: AuthedRequest, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.auth!.sub } });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
});

const customerProfileSchema = z.object({
  name: z.string().min(1).optional(),
  surname: z.string().optional(),
  address: z.string().min(1).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  mandal: z.string().optional(),
  village: z.string().optional(),
  pincode: z.string().optional(),
});

customerRouter.patch("/profile", async (req: AuthedRequest, res) => {
  const parsed = customerProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const customer = await prisma.customer.update({ where: { id: req.auth!.sub }, data: parsed.data });

  // Use the post-update record (not just this request's payload) since profile
  // saves are often partial — e.g. saving a new Mandal shouldn't require resending State/District.
  if (customer.state && customer.district && customer.mandal) {
    await recordMandal(customer.state, customer.district, customer.mandal);
    if (customer.village) await recordVillage(customer.state, customer.district, customer.mandal, customer.village);
  }

  res.json(customer);
});

const requestSchema = z.object({
  country: z.string().min(1).default("India"),
  state: z.string().min(1),
  district: z.string().min(1),
  mandal: z.string().min(1),
  landType: z.enum(["Agriculture", "Residential", "Commercial"]),
  machineType: z.enum(MACHINE_TYPES),
  depthFt: z.coerce.number().int().positive().max(MAX_DEPTH_FT),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  preferredDate: z.coerce.date(),
});

customerRouter.post("/requests", async (req: AuthedRequest, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const request = await prisma.borewellRequest.create({
    data: {
      ...parsed.data,
      code: genRequestCode(),
      customerId: req.auth!.sub,
    },
  });

  // Auto-generate a quote from every company that services this area, has priced this
  // depth, and marked itself available on the required date — no manual owner action.
  const bandsNeeded = Math.ceil(request.depthFt / 100);
  const candidates = await prisma.company.findMany({
    where: companyServiceAreaFilter(request.district, request.mandal),
  });
  const eligible = candidates.filter(
    (c) =>
      c.maxDepthFt >= request.depthFt &&
      c.rateCard.length >= bandsNeeded &&
      c.machineTypes.includes(request.machineType) &&
      c.availableDates.some((d) => isSameCalendarDay(d, request.preferredDate))
  );
  if (eligible.length) {
    await prisma.quote.createMany({
      data: eligible.map((c) => ({
        requestId: request.id,
        companyId: c.id,
        bandRates: c.rateCard.slice(0, bandsNeeded),
        machineType: request.machineType,
        estimatedCompletion: c.estimatedCompletion,
        casingRate6kg: c.casingRate6kg,
        casingRate8kg: c.casingRate8kg,
        casingRate10kg: c.casingRate10kg,
        casingRateIron: c.casingRateIron,
      })),
    });
  }

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
      const totalPrice = computeTotalFromBands(q.bandRates, request.depthFt);
      const effectiveRate = totalPrice / request.depthFt;
      return {
        id: q.id,
        requestId: q.requestId,
        companyId: q.companyId,
        companyName: q.company.name,
        bandRates: q.bandRates,
        totalPrice,
        depthFt: request.depthFt,
        casingRate6kg: q.casingRate6kg,
        casingRate8kg: q.casingRate8kg,
        casingRate10kg: q.casingRate10kg,
        casingRateIron: q.casingRateIron,
        machineType: q.machineType,
        estimatedCompletion: q.estimatedCompletion,
        rating: q.company.ratingAvg,
        distanceKm: dist,
        yearsExperience: q.company.experienceYears,
        blendedScore: blendedScore({ rating: q.company.ratingAvg, price: effectiveRate, distanceKm: dist }),
      };
    })
    .sort((a, b) => b.blendedScore - a.blendedScore)
    .map((q, i) => ({ ...q, rank: i + 1, isTop: i === 0 }));

  res.json(ranked);
});

/** Public company profile for a customer to review before booking — phone/exact address withheld until booked & paid. */
customerRouter.get("/companies/:id", async (req: AuthedRequest, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: { vehiclePhotos: true, borewellPhotos: true },
  });
  if (!company) return res.status(404).json({ error: "Company not found" });

  res.json({
    id: company.id,
    name: company.name,
    city: company.city,
    state: company.state,
    experienceYears: company.experienceYears,
    machineTypes: company.machineTypes,
    registrationNumber: company.registrationNumber,
    ratingAvg: company.ratingAvg,
    serviceAreas: company.serviceAreas,
    vehiclePhotos: company.vehiclePhotos.map((p) => ({ slot: p.slot, url: p.url })),
    borewellPhotos: company.borewellPhotos.map((p) => ({ id: p.id, url: p.url })),
  });
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
        bandRates: quote.bandRates,
        casingRate6kg: quote.casingRate6kg,
        casingRate8kg: quote.casingRate8kg,
        casingRate10kg: quote.casingRate10kg,
        casingRateIron: quote.casingRateIron,
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
      request: true,
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
    bandRates: booking.bandRates,
    totalPrice: computeTotalFromBands(booking.bandRates, booking.request.depthFt),
    machineType: booking.request.machineType,
    casingRate6kg: booking.casingRate6kg,
    casingRate8kg: booking.casingRate8kg,
    casingRate10kg: booking.casingRate10kg,
    casingRateIron: booking.casingRateIron,
    casingType: booking.casingType,
    casingFeet: booking.casingFeet,
    bookingFee: booking.bookingFee,
    createdAt: booking.createdAt,
    company: {
      id: booking.company.id,
      name: booking.company.name,
      city: booking.company.city,
      state: booking.company.state,
      experienceYears: booking.company.experienceYears,
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
