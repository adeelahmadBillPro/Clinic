/**
 * Promote a user to SUPER_ADMIN or create a new one.
 *
 * Usage:
 *   npx tsx scripts/seed-super-admin.ts <email> [password]
 *
 * Examples:
 *   npx tsx scripts/seed-super-admin.ts you@example.com
 *   npx tsx scripts/seed-super-admin.ts you@example.com NewPassword123
 */

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email) {
    console.error("Usage: npx tsx scripts/seed-super-admin.ts <email> [password]");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "SUPER_ADMIN",
        clinicId: null,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      },
    });
    console.log(`[✓] Promoted ${email} to SUPER_ADMIN${password ? " (password reset)" : ""}.`);
  } else {
    if (!password) {
      console.error("New user — please also pass a password as the 2nd argument.");
      process.exit(1);
    }
    await prisma.user.create({
      data: {
        email,
        name: "Platform Admin",
        role: "SUPER_ADMIN",
        password: await bcrypt.hash(password, 10),
        clinicId: null,
      },
    });
    console.log(`[✓] Created new SUPER_ADMIN user ${email}.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
