import { env } from "../env";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Sends an OTP SMS via MSG91's Send OTP API (https://api.msg91.com/api/v5/otp).
 * With no MSG91_AUTH_KEY configured (default in .env.example), falls back to
 * logging the code to the console so the booking/owner flows stay testable
 * without a live MSG91 account — swap in real keys and this starts sending
 * real SMS with no code changes.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (env.msg91MockOtp) {
    console.log(`[MSG91 mock] OTP for +91${phone}: ${code}`);
    return;
  }

  const url = new URL("https://api.msg91.com/api/v5/otp");
  url.searchParams.set("mobile", `91${phone}`);
  url.searchParams.set("authkey", env.msg91AuthKey);
  url.searchParams.set("otp", code);
  if (env.msg91TemplateId) url.searchParams.set("template_id", env.msg91TemplateId);

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 send OTP failed: ${res.status} ${body}`);
  }
}

export function newOtpCode(): string {
  return generateCode();
}

export function otpExpiry(): Date {
  return new Date(Date.now() + 5 * 60 * 1000);
}
