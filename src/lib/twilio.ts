import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
const smsFrom = process.env.TWILIO_SMS_FROM;

const client = sid && token ? twilio(sid, token) : null;

/**
 * Normalize to E.164.
 *
 * - Numbers with a leading `+` or international `00` prefix are assumed
 *   already-qualified and returned as-is.
 * - A leading `0` is interpreted as a local trunk and replaced with the
 *   caller-supplied country code (default "92" for Pakistan back-compat).
 * - Everything else is assumed to already include a country prefix.
 *
 * Callers should pass `clinic.settings.country` (or similar) once that
 * setting exists so a Dubai-based clinic doesn't get `+92` prepended.
 */
function normalizePhone(raw: string, countryCode = "92"): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed.replace(/\s|-|\(|\)/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (countryCode === "92" && digits.startsWith("0")) {
    return "+92" + digits.slice(1);
  }
  if (digits.startsWith(countryCode)) return "+" + digits;
  // Fall through — assume already has some country code.
  return "+" + digits;
}

export async function sendWhatsApp(
  to: string,
  body: string,
  countryCode = "92",
) {
  const phone = normalizePhone(to, countryCode);
  if (!phone) return { ok: false, error: "invalid phone" };

  if (!client || !whatsappFrom) {
    console.log(`\n[whatsapp:dev] → ${phone}\n${body}\n`);
    return { ok: true, dev: true as const };
  }
  try {
    const msg = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${phone}`,
      body,
    });
    return { ok: true, sid: msg.sid };
  } catch (err) {
    console.error("[whatsapp] send failed", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function sendSms(to: string, body: string, countryCode = "92") {
  const phone = normalizePhone(to, countryCode);
  if (!phone) return { ok: false, error: "invalid phone" };

  if (!client || !smsFrom) {
    console.log(`\n[sms:dev] → ${phone}\n${body}\n`);
    return { ok: true, dev: true as const };
  }
  try {
    const msg = await client.messages.create({
      from: smsFrom,
      to: phone,
      body,
    });
    return { ok: true, sid: msg.sid };
  } catch (err) {
    console.error("[sms] send failed", err);
    return { ok: false, error: (err as Error).message };
  }
}

// Compliance tail — P3-41: every outbound message has a STOP instruction.
// Until a Twilio inbound webhook flips the opt-out flag automatically,
// reception can toggle it manually in the patient edit UI.
const OPT_OUT_TAIL = "\nReply STOP to unsubscribe.";

export function tokenCalledMessage({
  clinicName,
  displayToken,
  doctorName,
  roomNumber,
}: {
  clinicName: string;
  displayToken: string;
  doctorName: string;
  roomNumber?: string | null;
}) {
  const room = roomNumber ? ` (Room ${roomNumber})` : "";
  return `${clinicName}: Your token ${displayToken} is now called. Please proceed to ${doctorName}${room}.${OPT_OUT_TAIL}`;
}

export function appointmentReminderMessage({
  clinicName,
  doctorName,
  when,
}: {
  clinicName: string;
  doctorName: string;
  when: Date;
}) {
  return `${clinicName}: Reminder — appointment with ${doctorName} on ${when.toLocaleString()}.${OPT_OUT_TAIL}`;
}

export function labReadyMessage({
  clinicName,
  orderNumber,
}: {
  clinicName: string;
  orderNumber: string;
}) {
  return `${clinicName}: Your lab report ${orderNumber} is ready. Please collect it from reception.${OPT_OUT_TAIL}`;
}
