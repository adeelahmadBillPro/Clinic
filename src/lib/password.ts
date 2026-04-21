import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

export function verifyOtp(otp: string, hash: string): boolean {
  return hashOtp(otp) === hash;
}
