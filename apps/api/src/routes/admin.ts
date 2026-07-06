import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../auth";

export const adminRouter = Router();
adminRouter.use(requireAuth("admin"));

adminRouter.get("/dashboard", async (_req, res) => {
  const [totalUsers, totalCompanies, activeRequests, totalBookings, recent] = await Promise.all([
    prisma.customer.count(),
    prisma.company.count(),
    prisma.borewellRequest.count({ where: { status: "OPEN" } }),
    prisma.booking.count(),
    prisma.booking.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: true, company: true, invoice: true, request: true },
    }),
  ]);

  res.json({
    totalUsers,
    totalCompanies,
    activeRequests,
    totalBookings,
    recentBookings: recent.map((b) => ({
      id: b.id,
      code: b.code,
      customerName: b.customer.name ?? b.customer.phone,
      companyName: b.company.name,
      amount: b.invoice?.total ?? b.request.depthFt * b.pricePerFt,
      status: b.status,
    })),
  });
});

adminRouter.get("/companies", async (_req, res) => {
  const companies = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });
  res.json(companies);
});

adminRouter.post("/companies/:id/verify", async (req, res) => {
  const company = await prisma.company.update({
    where: { id: req.params.id },
    data: { status: "VERIFIED" },
  });
  res.json(company);
});

adminRouter.get("/bookings", async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, company: true, invoice: true, request: true },
  });
  res.json(
    bookings.map((b) => ({
      id: b.id,
      code: b.code,
      customerName: b.customer.name ?? b.customer.phone,
      companyName: b.company.name,
      amount: b.invoice?.total ?? b.request.depthFt * b.pricePerFt,
      status: b.status,
      createdAt: b.createdAt,
    }))
  );
});

adminRouter.get("/analytics", async (_req, res) => {
  const invoices = await prisma.invoice.findMany({ select: { total: true, createdAt: true } });
  const payments = await prisma.payment.findMany({ where: { status: "PAID" }, select: { amount: true } });

  const now = new Date();
  const months: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({
      month: d.toLocaleString("en-IN", { month: "short" }),
      amount: invoices
        .filter((inv) => inv.createdAt >= d && inv.createdAt < next)
        .reduce((s, inv) => s + inv.total, 0),
    });
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalRevenueThisMonth = invoices
    .filter((inv) => inv.createdAt >= startOfMonth)
    .reduce((s, inv) => s + inv.total, 0);
  // Platform commission = booking fees collected.
  const commissionEarned = payments.reduce((s, p) => s + p.amount, 0);

  const byStatus = await prisma.booking.groupBy({ by: ["status"], _count: true });

  res.json({
    totalRevenueThisMonth,
    commissionEarned,
    revenueTrend: months,
    bookingsByStatus: byStatus.map((g) => ({ status: g.status, count: g._count })),
  });
});
