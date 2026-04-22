// Thin wrapper around Twilio Verify
// (https://www.twilio.com/docs/verify/api/verification). Twilio handles the
// code generation, storage, expiry, retries, and brute-force protection —
// we just start a verification and later check it.
//
// If Twilio credentials aren't set we fall back to a dev stub that accepts
// the code "123456", so the flow is still testable locally.

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const DEV = !SID || !TOKEN || !VERIFY_SID;
const DEV_CODE = '123456';

export function smsDevMode() { return DEV; }
export function smsDevCode() { return DEV_CODE; }

function basicAuth() {
  return 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64');
}

export async function startPhoneVerification(to) {
  if (DEV) {
    console.log(`[smsVerify:dev] would send SMS to ${to}; use code ${DEV_CODE}`);
    return { dev: true };
  }
  const body = new URLSearchParams({ To: to, Channel: 'sms' });
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`,
    { method: 'POST', headers: { Authorization: basicAuth() }, body },
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Twilio start ${res.status}: ${msg}`);
  }
  return res.json();
}

export async function checkPhoneVerification(to, code) {
  if (DEV) {
    return { ok: String(code) === DEV_CODE };
  }
  const body = new URLSearchParams({ To: to, Code: String(code) });
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`,
    { method: 'POST', headers: { Authorization: basicAuth() }, body },
  );
  if (!res.ok) return { ok: false };
  const json = await res.json();
  return { ok: json.status === 'approved', data: json };
}
