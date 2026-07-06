import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",

  msg91AuthKey: process.env.MSG91_AUTH_KEY ?? "",
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID ?? "",
  msg91MockOtp: process.env.MSG91_MOCK_OTP === "true" || !process.env.MSG91_AUTH_KEY,

  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  razorpayMock: !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET,

  adminSeedEmail: process.env.ADMIN_SEED_EMAIL ?? "admin@borewellconnect.com",
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD ?? "Admin@123",
};
