import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "admin@borewellconnect.com";
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "Admin@123";

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10) },
  });

  // Sample verified companies so a fresh install has quotes to rank.
  const companies = [
    { phone: "9876511111", name: "Sri Sai Borewells", ownerName: "Ramesh K.", city: "Sangareddy", experienceYears: 12, ratingAvg: 4.8, baseLat: 17.62, baseLng: 78.08, registrationNumber: "TS-DRL-4471", serviceAreas: ["Sangareddy", "Medak", "Hyderabad"], status: "VERIFIED" as const },
    { phone: "9876522222", name: "Lakshmi Borewells", ownerName: "Rajesh P.", city: "Medak", experienceYears: 10, ratingAvg: 4.6, baseLat: 17.9, baseLng: 78.27, registrationNumber: "TS-DRL-3120", serviceAreas: ["Medak", "Sangareddy"], status: "VERIFIED" as const },
    { phone: "9876533333", name: "Shiva Borewells", ownerName: "Shiva T.", city: "Patancheru", experienceYears: 9, ratingAvg: 4.7, baseLat: 17.53, baseLng: 78.26, registrationNumber: "TS-DRL-2987", serviceAreas: ["Sangareddy", "Hyderabad"], machineType: "Rotary", status: "VERIFIED" as const },
    { phone: "9876544444", name: "Ganesh Borewells", ownerName: "Ganesh M.", city: "Hyderabad", experienceYears: 8, ratingAvg: 4.5, baseLat: 17.38, baseLng: 78.48, registrationNumber: "TS-DRL-2205", serviceAreas: ["Hyderabad"], status: "PENDING" as const },
    { phone: "9876555555", name: "Surya Borewells", ownerName: "Suresh N.", city: "Nizamabad", experienceYears: 7, ratingAvg: 4.3, baseLat: 18.67, baseLng: 78.1, registrationNumber: "TS-DRL-1873", serviceAreas: ["Nizamabad"], machineType: "Rotary", status: "PENDING" as const },
  ];

  for (const c of companies) {
    await prisma.company.upsert({
      where: { phone: c.phone },
      update: {},
      create: { ...c, state: "Telangana" },
    });
  }

  console.log("Seeded admin + sample companies");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main().finally(() => prisma.$disconnect());
