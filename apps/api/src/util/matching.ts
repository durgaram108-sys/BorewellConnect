import { Prisma } from "@prisma/client";

/**
 * A company with no serviceAreas set is treated as unrestricted (matches everywhere) —
 * mirrors the original owner-side leads query's behavior.
 */
export function companyServiceAreaFilter(district: string, mandal: string): Prisma.CompanyWhereInput {
  return {
    OR: [{ serviceAreas: { equals: [] } }, { serviceAreas: { hasSome: [district, mandal] } }],
  };
}

/** Compares two dates by calendar day only (UTC), ignoring time-of-day. */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}
