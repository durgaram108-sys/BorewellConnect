export const DEPTH_BAND_SIZE_FT = 100;
export const MAX_DEPTH_FT = 2000;

export const MACHINE_TYPES = ['4 1/2"', '6 1/2"'] as const;

/**
 * Local mirror of apps/api's CASING_TYPES (packages/shared/src/constants.ts) — casing is
 * priced per foot, per type, and only finalized at job completion once the owner knows
 * what was actually used, so the quote/booking screens just list these as reference rates.
 */
export const CASING_TYPES = [
  { key: "6kg", label: "6kg PVC", field: "casingRate6kg" },
  { key: "8kg", label: "8kg PVC", field: "casingRate8kg" },
  { key: "10kg", label: "10kg PVC", field: "casingRate10kg" },
  { key: "iron", label: "Iron / GI", field: "casingRateIron" },
] as const;
export type CasingTypeKey = (typeof CASING_TYPES)[number]["key"];

export function bandsNeededForDepth(depthFt: number): number {
  return Math.ceil(depthFt / DEPTH_BAND_SIZE_FT);
}

export function bandLabel(bandIndex: number): string {
  const from = bandIndex * DEPTH_BAND_SIZE_FT + 1;
  const to = (bandIndex + 1) * DEPTH_BAND_SIZE_FT;
  return `${from}-${to} ft`;
}

/**
 * Local mirror of apps/api's computeTotalFromBands (packages/shared/src/constants.ts) —
 * kept as a small standalone copy rather than importing packages/shared here, since this
 * is only used for a live preview total while typing and doesn't need to share a module.
 */
export function computeTotalFromBands(bandRates: number[], depthFt: number): number {
  let total = 0;
  let remaining = depthFt;
  for (const rate of bandRates) {
    if (remaining <= 0) break;
    const ftInBand = Math.min(DEPTH_BAND_SIZE_FT, remaining);
    total += ftInBand * (rate || 0);
    remaining -= DEPTH_BAND_SIZE_FT;
  }
  return total;
}
