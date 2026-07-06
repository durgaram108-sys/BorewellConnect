import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../env";

const client = env.razorpayMock
  ? null
  : new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });

export interface CreatedOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

/**
 * Creates a Razorpay order for the booking fee. Without live keys configured
 * (env.razorpayMock), returns a mock order id so the payment screen and
 * verification flow can still be exercised end-to-end in dev — dropping in
 * real RAZORPAY_KEY_ID/SECRET switches this to real Razorpay orders with no
 * code changes.
 */
export async function createOrder(amountInRupees: number, receipt: string): Promise<CreatedOrder> {
  const amountPaise = amountInRupees * 100;

  if (env.razorpayMock || !client) {
    return {
      orderId: `order_mock_${receipt}`,
      amount: amountPaise,
      currency: "INR",
      keyId: "rzp_test_mock",
    };
  }

  const order = await client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
  });

  return {
    orderId: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    keyId: env.razorpayKeyId,
  };
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (env.razorpayMock) {
    // Mock mode: accept the sentinel signature the mobile mock-checkout sends.
    return signature === `mock_sig_${paymentId}`;
  }

  const expected = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (env.razorpayMock || !env.razorpayWebhookSecret) return true;
  const expected = crypto
    .createHmac("sha256", env.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}
