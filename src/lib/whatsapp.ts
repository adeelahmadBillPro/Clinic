function normalizePhoneForWa(raw: string): string {
  // Pakistan numbers typically: 03001234567 → 923001234567
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return "92" + digits.slice(1);
  return digits;
}

/**
 * Phone-only wa.me link. Use this when the message contains PHI
 * (patient name, MRN, medicines, bill totals) — the text stays on the
 * user's clipboard and never hits the URL (which browsers, proxies, and
 * wa.me's redirector would otherwise log and cache).
 *
 * Pair with `navigator.clipboard.writeText(...)` + a toast before
 * opening the link.
 */
export function whatsappLinkForPhone(phone: string): string {
  return `https://wa.me/${normalizePhoneForWa(phone)}`;
}

export function buildTokenSlipText(slip: {
  displayToken: string;
  patientName: string;
  doctorName: string;
  issuedAt: string;
  expiresAt: string;
  clinicName?: string;
}): string {
  const brand = slip.clinicName ?? "Clinic";
  return [
    `${brand} — Token ${slip.displayToken}`,
    ``,
    `Patient: ${slip.patientName}`,
    `Doctor: ${slip.doctorName}`,
    `Issued: ${new Date(slip.issuedAt).toLocaleString()}`,
    `Valid until: ${new Date(slip.expiresAt).toLocaleString()}`,
    ``,
    `Please wait for your number to be called.`,
  ].join("\n");
}

/**
 * Non-PHI-safe inline link. Use ONLY for messages that contain no
 * clinical or identifying patient content (e.g. "Your token 42 is
 * ready"). PHI callers must use `whatsappLinkForPhone` + clipboard.
 */
export function whatsappLinkForMessage(
  phone: string,
  message: string,
): string {
  return `https://wa.me/${normalizePhoneForWa(phone)}?text=${encodeURIComponent(message)}`;
}

/**
 * @deprecated PHI in URL — use `whatsappLinkForPhone` with
 * `buildTokenSlipText` on the clipboard instead. Retained until every
 * caller migrates (see P3-45 in CHANGELOG).
 */
export function whatsappLinkForSlip(slip: {
  displayToken: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  issuedAt: string;
  expiresAt: string;
  clinicName?: string;
}): string {
  return `https://wa.me/${normalizePhoneForWa(slip.patientPhone)}?text=${encodeURIComponent(
    buildTokenSlipText(slip),
  )}`;
}
