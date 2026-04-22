// Thin wrapper around Resend's HTTP API (https://resend.com/docs/api-reference/emails).
// If RESEND_API_KEY is not set we fall back to logging the email to the
// console so the app stays usable in local dev without credentials.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'AG Rental <onboarding@resend.dev>';

export function mailerDevMode() {
  return !RESEND_API_KEY;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.log(
      `[mailer:dev] would send to ${to}\n  subject: ${subject}\n  ${text || html}`,
    );
    return { dev: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html, text }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${msg}`);
  }
  return res.json();
}

export async function sendVerificationCode(to, code) {
  return sendEmail({
    to,
    subject: 'Your AG Rental verification code',
    text: `Your AG Rental verification code is ${code}. It expires in 15 minutes.`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
        <p>Your AG Truck &amp; Trailer Rental verification code is:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0">${code}</p>
        <p style="color:#64748b;font-size:13px">It expires in 15 minutes.
        If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}
