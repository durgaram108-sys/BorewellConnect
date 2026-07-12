import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

export const locationsRouter = Router();

const mandalQuerySchema = z.object({
  state: z.string().min(1),
  district: z.string().min(1),
});

locationsRouter.get("/mandals", async (req, res) => {
  const parsed = mandalQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { state, district } = parsed.data;

  const rows = await prisma.mandalSuggestion.findMany({
    where: { state, district },
    orderBy: { mandal: "asc" },
    select: { mandal: true },
  });
  res.json(rows.map((r) => r.mandal));
});

const villageQuerySchema = mandalQuerySchema.extend({
  mandal: z.string().min(1),
});

locationsRouter.get("/villages", async (req, res) => {
  const parsed = villageQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { state, district, mandal } = parsed.data;

  const rows = await prisma.villageSuggestion.findMany({
    where: { state, district, mandal: { equals: mandal, mode: "insensitive" } },
    orderBy: { village: "asc" },
    select: { village: true },
  });
  res.json(rows.map((r) => r.village));
});
