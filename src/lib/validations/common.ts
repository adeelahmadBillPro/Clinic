import { z } from "zod";

/**
 * Accepts:
 *   - International E.164: +923001234567, +971501234567, +12025550123 (7–15 digits after +)
 *   - PK-native shortcuts: 0300-1234567 / 03001234567
 *   - 00-prefixed international: 00923001234567
 * Any hyphens, spaces, parentheses, dots are stripped before validation.
 */
const PK_LOCAL_RE = /^0?3\d{9}$/;
const INTL_RE = /^\+\d{7,15}$/;

function normalize(v: string): string {
  const stripped = v.replace(/[\s\-().]/g, "");
  if (stripped.startsWith("00")) return "+" + stripped.slice(2);
  return stripped;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform(normalize)
  .refine(
    (v) => INTL_RE.test(v) || PK_LOCAL_RE.test(v),
    "Enter a valid mobile number — include country code (e.g. +92 300 1234567)",
  );

export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform(normalize)
  .refine(
    (v) => v === "" || INTL_RE.test(v) || PK_LOCAL_RE.test(v),
    "Enter a valid mobile number — include country code (e.g. +92 300 1234567)",
  )
  .optional()
  .or(z.literal(""));

/**
 * Human name — 2+ chars, letters (any script) / marks / dot / apostrophe
 * / hyphen / space. `\p{L}` and `\p{M}` accept Arabic / Urdu / Hindi /
 * accented European names that the old ASCII-only regex rejected.
 */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "At least 2 characters")
  .max(100, "Too long (max 100)")
  .regex(
    /^[\p{L}\p{M}.\-'’ ]+$/u,
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
