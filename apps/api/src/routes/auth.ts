import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken } from "../auth";
import { newOtpCode, otpExpiry, sendOtpSms } from "../services/otp";
import { env } from "../env";

export const authRouter = Router();

const phoneSchema = z.object({ phone: z.string().regex(/^\d{10}$/, "Enter a 10-digit mobile number") });
const verifySchema = phoneSchema.extend({ code: z.string().length(6) });

// ---- Customer OTP auth ----

authRouter.post("/customer/otp/request", async (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { phone } = parsed.data;
  const code = newOtpCode();
  await prisma.otp.create({ data: { phone, purpose: "CUSTOMER", code, expiresAt: otpExpiry() } });
  await sendOtpSms(phone, code);

  res.json({ ok: true, devHint: env.msg91MockOtp ? "OTP logged to server console (mock mode)" : undefined });
});

authRouter.post("/customer/otp/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { phone, code } = parsed.data;

  const otp = await prisma.otp.findFirst({
    where: { phone, purpose: "CUSTOMER", code, verified: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });

  await prisma.otp.update({ where: { id: otp.id }, data: { verified: true } });

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  const token = signToken({ sub: customer.id, role: "customer" });
  res.json({ token, customer: { id: customer.id, phone: customer.phone, name: customer.name } });
});

// ---- Owner (borewell company) OTP auth ----

authRouter.post("/owner/otp/request", async (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { phone } = parsed.data;
  const code = newOtpCode();
  await prisma.otp.create({ data: { phone, purpose: "OWNER", code, expiresAt: otpExpiry() } });
  await sendOtpSms(phone, code);

  res.json({ ok: true, devHint: env.msg91MockOtp ? "OTP logged to server console (mock mode)" : undefined });
});

authRouter.post("/owner/otp/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { phone, code } = parsed.data;

  const otp = await prisma.otp.findFirst({
    where: { phone, purpose: "OWNER", code, verified: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });

  await prisma.otp.update({ where: { id: otp.id }, data: { verified: true } });

  let company = await prisma.company.findUnique({ where: { phone } });
  let isNew = false;
  if (!company) {
    isNew = true;
    company = await prisma.company.create({
      data: { phone, name: "New Borewell Company", ownerName: "", city: "", state: "Telangana" },
    });
  }

  const token = signToken({ sub: company.id, role: "owner" });
  res.json({ token, company, isNew });
});

// ---- Admin email/password auth ----

const adminLoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/admin/login", async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { email, password } = parsed.data;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ sub: admin.id, role: "admin" });
  res.json({ token, admin: { id: admin.id, email: admin.email } });
});
