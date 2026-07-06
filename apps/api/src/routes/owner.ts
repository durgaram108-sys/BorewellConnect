import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../auth";
import { genInvoiceCode } from "../util/codes";

export const ownerRouter = Router();
ownerRouter.use(requireAuth("owner"));

/** Open leads in the company's service area — customer identity/contact withheld. */
ownerRouter.get("/leads", async (req: AuthedRequest, res) => {
  const company = await prisma.company.findUnique({ where: { id: req.auth!.sub } });
  if (!company) return res.status(404).json({ error: "Company not found" });

  const leads = await prisma.borewellRequest.findMany({
    where: {
      status: "OPEN",
      quotes: { none: { companyId: company.id } },
      ...(company.serviceAreas.length
        ? { OR: [{ district: { in: company.serviceAreas } }, { mandal: { in: company.serviceAreas } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  // Only the job facts owners need to bid — no customer name/phone/exact coords.
  res.json(
    leads.map((l) => ({
      id: l.id,
      code: l.code,
      country: l.country,
      state: l.state,
      district: l.district,
      mandal: l.mandal,
      landType: l.landType,
      depthFt: l.depthFt,
      preferredDate: l.preferredDate,
      createdAt: l.createdAt,
    }))
  );
});

const quoteSchema = z.object({
  pricePerFt: z.coerce.number().int().positive(),
  machineType: z.string().min(1).default("DTH"),
  estimatedCompletion: z.string().min(1).default("3–4 days"),
});

ownerRouter.post("/leads/:requestId/quote", async (req: AuthedRequest, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const request = await prisma.borewellRequest.findUnique({ where: { id: req.params.requestId } });
  if (!request || request.status !== "OPEN") return res.status(404).json({ error: "Lead not open" });

  const existing = await prisma.quote.findUnique({
    where: { requestId_companyId: { requestId: request.id, companyId: req.auth!.sub } },
  });
  if (existing) return res.status(409).json({ error: "Quote already submitted for this lead" });

  const quote = await prisma.quote.create({
    data: { requestId: request.id, companyId: req.auth!.sub, ...parsed.data },
  });
  res.status(201).json(quote);
});

/** Jobs = bookings won by this company. Customer contact revealed (customer already paid). */
ownerRouter.get("/jobs", async (req: AuthedRequest, res) => {
  const jobs = await prisma.booking.findMany({
    where: { companyId: req.auth!.sub },
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      request: true,
      milestones: { orderBy: { order: "asc" } },
      invoice: true,
    },
  });

  res.json(
    jobs.map((j) => {
      const paid = j.status !== "CONFIRMED";
      return {
        id: j.id,
        code: j.code,
        status: j.status,
        pricePerFt: j.pricePerFt,
        district: j.request.district,
        mandal: j.request.mandal,
        depthFt: j.request.depthFt,
        // Customer details shared only after the booking fee is paid.
        customerName: paid ? j.customer.name ?? "Customer" : null,
        customerPhone: paid ? j.customer.phone : null,
        milestones: j.milestones.map((m) => ({ label: m.label, completedAt: m.completedAt })),
        hasInvoice: !!j.invoice,
        createdAt: j.createdAt,
      };
    })
  );
});

/** Advance the next incomplete milestone; completing the last one finishes the job + issues the invoice. */
ownerRouter.post("/jobs/:id/milestones/advance", async (req: AuthedRequest, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, companyId: req.auth!.sub },
    include: { milestones: { orderBy: { order: "asc" } }, request: true },
  });
  if (!booking) return res.status(404).json({ error: "Job not found" });

  const next = booking.milestones.find((m) => !m.completedAt);
  if (!next) return res.status(409).json({ error: "All milestones already complete" });

  const isLast = next.order === booking.milestones.length - 1;

  await prisma.$transaction(async (tx) => {
    await tx.milestone.update({ where: { id: next.id }, data: { completedAt: new Date() } });
    await tx.workUpdate.create({ data: { bookingId: booking.id, label: next.label } });

    if (isLast) {
      const drilling = booking.request.depthFt * booking.pricePerFt;
      const machineCasing = 11500;
      const total = drilling + machineCasing - booking.bookingFee;
      await tx.invoice.create({
        data: {
          code: genInvoiceCode(),
          bookingId: booking.id,
          total,
          lineItems: [
            { label: `Drilling (${booking.request.depthFt} ft × ₹${booking.pricePerFt}/ft)`, amount: drilling },
            { label: "Machine & Casing Charges", amount: machineCasing },
            { label: "Booking Fee (paid)", amount: -booking.bookingFee },
          ],
        },
      });
      await tx.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED" } });
      await tx.borewellRequest.update({ where: { id: booking.requestId }, data: { status: "COMPLETED" } });
    } else if (booking.status === "PAID") {
      await tx.booking.update({ where: { id: booking.id }, data: { status: "IN_PROGRESS" } });
    }
  });

  res.json({ ok: true, completed: next.label, jobDone: isLast });
});

const workUpdateSchema = z.object({ label: z.string().min(1), photoUrl: z.string().url().optional() });

ownerRouter.post("/jobs/:id/updates", async (req: AuthedRequest, res) => {
  const parsed = workUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, companyId: req.auth!.sub },
  });
  if (!booking) return res.status(404).json({ error: "Job not found" });

  const update = await prisma.workUpdate.create({
    data: { bookingId: booking.id, label: parsed.data.label, photoUrl: parsed.data.photoUrl },
  });
  res.status(201).json(update);
});

ownerRouter.get("/earnings", async (req: AuthedRequest, res) => {
  const completed = await prisma.booking.findMany({
    where: { companyId: req.auth!.sub, status: "COMPLETED" },
    include: { invoice: true },
    orderBy: { createdAt: "desc" },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonth = completed
    .filter((b) => b.createdAt >= startOfMonth)
    .reduce((sum, b) => sum + (b.invoice?.total ?? 0), 0);

  res.json({
    thisMonth,
    recentPayouts: completed.slice(0, 10).map((b) => ({ code: b.code, amount: b.invoice?.total ?? 0 })),
  });
});

// ---- Profile ----

ownerRouter.get("/profile", async (req: AuthedRequest, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.auth!.sub },
    include: { vehiclePhotos: true, borewellPhotos: true },
  });
  if (!company) return res.status(404).json({ error: "Company not found" });
  res.json(company);
});

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  ownerName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  experienceYears: z.coerce.number().int().min(0).optional(),
  registrationNumber: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  machineType: z.string().optional(),
  baseLat: z.coerce.number().optional(),
  baseLng: z.coerce.number().optional(),
});

ownerRouter.patch("/profile", async (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const company = await prisma.company.update({ where: { id: req.auth!.sub }, data: parsed.data });
  res.json(company);
});

const photoSchema = z.object({
  slot: z.enum(["vehicle-front", "drill-unit", "registration"]),
  url: z.string().min(1),
});

/** Vehicle/machine photo slots — stores a URL or data URI per named slot. */
ownerRouter.put("/profile/photos", async (req: AuthedRequest, res) => {
  const parsed = photoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const photo = await prisma.vehiclePhoto.upsert({
    where: { companyId_slot: { companyId: req.auth!.sub, slot: parsed.data.slot } },
    update: { url: parsed.data.url },
    create: { companyId: req.auth!.sub, ...parsed.data },
  });
  res.json(photo);
});

const borewellPhotoSchema = z.object({ url: z.string().min(1) });

/** Portfolio gallery of completed/example borewell work — shown to customers, unlimited count. */
ownerRouter.post("/profile/borewell-photos", async (req: AuthedRequest, res) => {
  const parsed = borewellPhotoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const photo = await prisma.borewellPhoto.create({
    data: { companyId: req.auth!.sub, url: parsed.data.url },
  });
  res.status(201).json(photo);
});

ownerRouter.delete("/profile/borewell-photos/:id", async (req: AuthedRequest, res) => {
  const photo = await prisma.borewellPhoto.findUnique({ where: { id: req.params.id } });
  if (!photo || photo.companyId !== req.auth!.sub) return res.status(404).json({ error: "Photo not found" });

  await prisma.borewellPhoto.delete({ where: { id: photo.id } });
  res.json({ ok: true });
});
