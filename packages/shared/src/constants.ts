export const CUSTOMER_STEP_LABELS = [
  "Login",
  "Verify OTP",
  "Home",
  "New Request",
  "Select Location",
  "Quotations",
  "Compare",
  "Confirm",
  "Payment",
  "Tracking",
  "Job Details",
  "Work Updates",
  "Invoice",
  "Review",
  "My Bookings",
] as const;

export const OWNER_STEP_LABELS = [
  "Login",
  "Verify OTP",
  "Dashboard",
  "New Lead",
  "Submit Quote",
  "Active Jobs",
  "Job Update",
  "Earnings",
  "Profile",
] as const;

export const MILESTONES = [
  "Request Accepted",
  "Reached Site",
  "Drilling Started",
  "Work Completed",
] as const;

export const LAND_TYPES = ["Agriculture", "Residential", "Commercial"] as const;

export const BOOKING_FEE = 500;

export const BOOKING_STATUS = {
  CONFIRMED: "CONFIRMED",
  PAID: "PAID",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const COMPANY_STATUS = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
} as const;
export type CompanyStatus = (typeof COMPANY_STATUS)[keyof typeof COMPANY_STATUS];

/**
 * Blended quote ranking: matches the prototype's formula so "best match"
 * ordering feels the same as what the design was validated against.
 */
export function blendedScore(q: { rating: number; price: number; distanceKm: number }): number {
  return Math.round((q.rating * 20 - q.price * 0.12 - q.distanceKm * 2.5) * 10) / 10;
}

export const DEPTH_BAND_SIZE_FT = 100;
export const MAX_DEPTH_FT = 2000;

/**
 * Depth-banded pricing total: bandRates[0] covers ft 1-100, bandRates[1]
 * covers ft 101-200, etc. Each band contributes its rate times however
 * much of the request's depth actually falls in that band.
 */
export function computeTotalFromBands(bandRates: number[], depthFt: number): number {
  let total = 0;
  let remaining = depthFt;
  for (const rate of bandRates) {
    if (remaining <= 0) break;
    const ftInBand = Math.min(DEPTH_BAND_SIZE_FT, remaining);
    total += ftInBand * rate;
    remaining -= DEPTH_BAND_SIZE_FT;
  }
  return total;
}
