import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || "noreply@clinicos.app";

const resend = apiKey ? new Resend(apiKey) : null;

type SendEmailOpts = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailOpts) {
  if (!resend) {
    console.log("\n[email:dev] ─────────────────────────────────");
    console.log(`  to:      ${to}`);
    console.log(`  subject: ${subject}`);
    console.log(`  text:    ${text ?? "(see html)"}`);
    console.log("───────────────────────────────────────────────\n");
    return { ok: true, dev: true as const };
  }

  const result = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
    text,
  });

  if (result.error) {
    console.error("[email] send failed", result.error);
    return { ok: false, error: result.error.message };
  }

  return { ok: true, id: result.data?.id };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(1, local.length));
  return `${visible}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

export function passwordResetEmailTemplate(otp: string, clinicName?: string) {
  const brand = clinicName || "ClinicOS";
  return {
    subject: `Your ${brand} password reset code`,
    text: `Your ${brand} password reset code is ${otp}. It expires in 10 minutes.`,
    html: `
<!doctype html>
<html>
  <body style="font-family:Inter,system-ui,sans-serif;background:#f6f8fa;margin:0;padding:32px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="color:#0F6E56;font-weight:700;font-size:20px;margin-bottom:8px;">${brand}</div>
      <h1 style="font-size:22px;color:#111827;margin:16px 0 8px;">Password reset code</h1>
      <p style="color:#4b5563;line-height:1.6;">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="margin:24px 0;padding:20px;background:#0F6E56;color:#fff;border-radius:10px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:700;">${otp}</div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
  </body>
</html>`,
  };
}
