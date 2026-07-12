import { prisma } from "../prisma";

/**
 * Records a Mandal/Village the first time someone enters it for a given
 * State+District(+Mandal), so later users in the same area see it as a
 * dropdown suggestion instead of retyping it. Case-insensitive existence
 * check keeps "Kondapur" and "kondapur" from becoming two entries; the
 * create is best-effort (a concurrent duplicate insert is simply ignored).
 */
export async function recordMandal(state: string, district: string, mandal: string): Promise<void> {
  const trimmed = mandal.trim();
  if (!state || !district || !trimmed) return;

  const exists = await prisma.mandalSuggestion.findFirst({
    where: { state, district, mandal: { equals: trimmed, mode: "insensitive" } },
  });
  if (exists) return;

  await prisma.mandalSuggestion.create({ data: { state, district, mandal: trimmed } }).catch(() => {});
}

export async function recordVillage(state: string, district: string, mandal: string, village: string): Promise<void> {
  const trimmedMandal = mandal.trim();
  const trimmedVillage = village.trim();
  if (!state || !district || !trimmedMandal || !trimmedVillage) return;

  const exists = await prisma.villageSuggestion.findFirst({
    where: {
      state,
      district,
      mandal: { equals: trimmedMandal, mode: "insensitive" },
      village: { equals: trimmedVillage, mode: "insensitive" },
    },
  });
  if (exists) return;

  await prisma.villageSuggestion
    .create({ data: { state, district, mandal: trimmedMandal, village: trimmedVillage } })
    .catch(() => {});
}
