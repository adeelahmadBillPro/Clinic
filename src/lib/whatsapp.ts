function normalizePhoneForWa(raw: string): string {
  // Pakistan numbers typically: 03001234567 → 923001234567
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return "92" + digits.slice(1);
  return digits;
}

export function whatsappLinkForSlip(slip: {
  displayToken: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  issuedAt: string;
  expiresAt: string;
  clinicName?: string;
}): string {
  const brand = slip.clinicName ?? "Clinic";
  const text = [
    `${brand} — Token ${slip.displayToken}`,
    ``,
    `Patient: ${slip.patientName}`,
    `Doctor: ${slip.doctorName}`,
    `Issued: ${new Date(slip.issuedAt).toLocaleString()}`,
    `Valid until: ${new Date(slip.expiresAt).toLocaleString()}`,
    ``,
    `Please wait for your number to be called.`,
  ].join("\n");
  const phone = normalizePhoneForWa(slip.patientPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function whatsappLinkForMessage(
  phone: string,
  message: string,
): string {
  return `https://wa.me/${normalizePhoneForWa(phone)}?text=${encodeURIComponent(message)}`;
}
