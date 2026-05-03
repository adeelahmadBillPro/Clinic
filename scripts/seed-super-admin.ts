/**
 * Promote a user to SUPER_ADMIN or create a new one.
 *
 * Usage:
 *   SEED_PASSWORD=... npx tsx scripts/seed-super-admin.ts <email>
 *   npx tsx scripts/seed-super-admin.ts <email>               # prompt for password
 *
 * Flags:
 *   --force-orphan   promote even if the user currently owns a clinic
 *                    (the clinic will be left with an OWNER that is now
 *                    SUPER_ADMIN — verify no orphan takeover)
 *
 * Why the env / prompt path: reading the password from `process.argv`
 * exposes it in the process list (`ps aux`) and in shell history.
 */

import { PrismaClient } from "@prisma/client";
import * as readline from "readline";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function promptPassword(): Promise<string> {
  // Hide the typed password from the TTY. Falls back to visible typing
  // if stdin isn't a TTY (e.g. piped input).
  return await new Promise<string>((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const anyIn = process.stdin as NodeJS.ReadStream & { isTTY?: boolean };
    if (anyIn.isTTY && typeof anyIn.setRawMode === "function") {
      anyIn.setRawMode(true);
    }
    process.stdout.write("Password: ");
    let buf = "";
    const onData = (chunk: Buffer) => {
      const s = chunk.toString();
      for (const ch of s) {
        const code = ch.charCodeAt(0);
        if (code === 13 || code === 10) {
          process.stdout.write("\n");
          process.stdin.removeListener("data", onData);
          if (anyIn.isTTY && typeof anyIn.setRawMode === "function") {
            anyIn.setRawMode(false);
          }
          rl.close();
          resolve(buf);
          return;
        }
        if (code === 3) {
          // Ctrl-C
          process.exit(130);
        }
        if (code === 127 || code === 8) {
          if (buf.length) {
            buf = buf.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        buf += ch;
        process.stdout.write("*");
      }
    };
    process.stdin.on("data", onData);
    process.stdin.on("error", reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const forceOrphan = args.includes("--force-orphan");
  const positional = args.filter((a) => !a.startsWith("--"));
  const email = positional[0];

  if (!email) {
    console.error(
      "Usage: SEED_PASSWORD=... npx tsx scripts/seed-super-admin.ts <email> [--force-orphan]",
    );
    process.exit(1);
  }

  let password = process.env.SEED_PASSWORD ?? "";
  if (!password) {
    password = await promptPassword();
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Refuse to promote a clinic OWNER into SUPER_ADMIN unless explicitly
    // forced — that leaves the clinic without an accessible owner
    // account and forces a support ticket to fix.
    const ownedClinic = await prisma.clinic.findFirst({
      where: { ownerId: existing.id },
      select: { id: true, name: true, slug: true },
    });
    if (ownedClinic && !forceOrphan) {
      console.error(
        `[x] ${email} owns clinic "${ownedClinic.name}" (${ownedClinic.slug}).`,
      );
      console.error(
        "   Promoting would orphan that clinic. Re-run with --force-orphan if you really mean to.",
      );
      process.exit(2);
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "SUPER_ADMIN",
        clinicId: null,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        // Auto-verify — auth.ts rejects logins where emailVerifiedAt is
        // null. We trust the operator running this script to have
        // already verified the address out-of-band.
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        ...(password ? { password: await hashPassword(password) } : {}),
      },
    });
    console.log(
      `[✓] Promoted ${email} to SUPER_ADMIN${password ? " (password reset)" : ""}.`,
    );
  } else {
    if (!password) {
      console.error(
        "New user requires a password via SEED_PASSWORD env or the prompt.",
      );
      process.exit(1);
    }
    await prisma.user.create({
      data: {
        email,
        name: "Platform Admin",
        role: "SUPER_ADMIN",
        password: await hashPassword(password),
        clinicId: null,
        // Skip the email-verify dance for super admins — they're seeded
        // by the operator, not signing up via the public form.
        emailVerifiedAt: new Date(),
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
