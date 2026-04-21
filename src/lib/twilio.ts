import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
const smsFrom = process.env.TWILIO_SMS_FROM;

const client = sid && token ? twilio(sid, token) : null;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92")) return "+" + digits;
  if (digits.startsWith("0")) return "+92" + digits.slice(1);
  if (raw.startsWith("+")) return raw;
  return "+" + digits;
}

export async function sendWhatsApp(to: string, body: string) {
  const phone = normalizePhone(to);
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

export async function sendSms(to: string, body: string) {
  const phone = normalizePhone(to);
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
  return `${clinicName}: Your token ${displayToken} is now called. Please proceed to ${doctorName}${room}.`;
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
  return `${clinicName}: Reminder — appointment with ${doctorName} on ${when.toLocaleString()}.`;
}

export function labReadyMessage({
  clinicName,
  orderNumber,
}: {
  clinicName: string;
  orderNumber: string;
}) {
  return `${clinicName}: Your lab report ${orderNumber} is ready. Please collect it from reception.`;
}
