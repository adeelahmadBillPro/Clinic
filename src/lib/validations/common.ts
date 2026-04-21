import { z } from "zod";

/**
 * Pakistan phone numbers, accepted formats:
 *   0300-1234567 / 03001234567
 *   +92 300 1234567 / +923001234567
 *   00923001234567
 * Any hyphens, spaces, parentheses stripped first.
 * Final digits must be 10 (after leading 0) or 12 (with 92 country code).
 */
const PK_PHONE_RE = /^(\+?92|0)?3\d{9}$/;

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((v) => v.replace(/[\s\-().]/g, ""))
  .refine(
    (v) => PK_PHONE_RE.test(v),
    "Enter a valid PK mobile — e.g. 0300-1234567",
  );

export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-().]/g, ""))
  .refine(
    (v) => v === "" || PK_PHONE_RE.test(v),
    "Enter a valid PK mobile — e.g. 0300-1234567",
  )
  .optional()
  .or(z.literal(""));

/** Human name — 2+ chars, letters / dot / apostrophe / hyphen / space. */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "At least 2 characters")
  .max(100, "Too long (max 100)")
  .regex(
    /^[a-zA-Z.\-'’ ]+$/,
    "Letters, spaces, dot and hyphen only",
  );

/** Simple text field with min/max, no regex. */
export const shortTextSchema = (min = 2, max = 150, label = "This field") =>
  z
    .string()
    .trim()
    .min(min, `${label}: at least ${min} characters`)
    .max(max, `${label}: too long (max ${max})`);

export function normalizePkPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("92")) return "+" + digits;
  if (digits.startsWith("0")) return "+92" + digits.slice(1);
  return digits;
}
