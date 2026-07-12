import express from "express";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { customerRouter } from "./routes/customer";
import { ownerRouter } from "./routes/owner";
import { adminRouter } from "./routes/admin";
import { locationsRouter } from "./routes/locations";
import { verifyWebhookSignature } from "./services/razorpay";
import { prisma } from "./prisma";

const app = express();
app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",") }));

// Razorpay webhook needs the raw body for signature verification — mount before json().
app.post("/webhooks/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const raw = req.body.toString("utf8");
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = JSON.parse(raw);
  if (event.event === "payment.captured") {
    const orderId: string = event.payload?.payment?.entity?.order_id;
    const paymentId: string = event.payload?.payment?.entity?.id;
    const payment = await prisma.payment.findFirst({ where: { orderId } });
    if (payment && payment.status !== "PAID") {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", paymentId } }),
        prisma.booking.update({ where: { id: payment.bookingId }, data: { status: "PAID" } }),
      ]);
    }
  }
  res.json({ ok: true });
});

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/customer", customerRouter);
app.use("/owner", ownerRouter);
app.use("/admin", adminRouter);
app.use("/locations", locationsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`Borewell Connect API listening on :${env.port}`);
  if (env.msg91MockOtp) console.log("MSG91 in MOCK mode — OTPs logged to console");
  if (env.razorpayMock) console.log("Razorpay in MOCK mode — payments auto-verify with mock signature");
});
