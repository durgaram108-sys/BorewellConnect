import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

// Seeds only the admin portal login. Customers and borewell companies
// register themselves from the app (first OTP login creates the account).
async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "admin@borewellconnect.com";
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "Admin@123";

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10) },
  });

  console.log(`Seeded admin login: ${adminEmail} / ${adminPassword}`);
}

main().finally(() => prisma.$disconnect());
