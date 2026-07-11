export const DEPTH_BAND_SIZE_FT = 100;
export const MAX_DEPTH_FT = 2000;

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
