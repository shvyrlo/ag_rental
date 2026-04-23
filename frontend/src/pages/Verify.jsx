import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useT } from '../i18n/i18n.jsx';

// Account verification wizard.
//
//   1. Email — required; user can't reach the client dashboard without it.
//   2. Phone — optional, currently DISABLED (Twilio isn't wired up on
//              Railway). Flip PHONE_VERIFICATION_ENABLED back to true once
//              the TWILIO_* env vars are in place.
//
// Both steps call the backend, which returns a fresh user record and
// token on success; we push those back into AuthContext via applyAuth.
const PHONE_VERIFICATION_ENABLED = false;

export default function Verify() {
  const t = useT();
  const { user, applyAuth, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // Step starts at 'email'. Only moves to 'phone' if the feature is on AND
  // the email is already verified (e.g. user navigated back to /verify).
  const initialStep = user?.email_verified && PHONE_VERIFICATION_ENABLED
    ? 'phone'
    : 'email';
  const [step, setStep] = useState(initialStep);
  useEffect(() => {
    if (user?.email_verified && step === 'email' && PHONE_VERIFICATION_ENABLED) {
      setStep('phone');
    }
  }, [user, step]);

  if (!user) {
    // Nobody's logged in — send them to /login.
    navigate('/login', { replace: true });
    return null;
  }

  function finish() {
    const target =
      user.role === 'admin' ? '/admin' :
      user.role === 'mechanic' ? '/mechanic' :
      '/client';
    navigate(target, { replace: true });
  }

  // With phone verification off, if the user somehow lands here with their
  // email already verified, just send them to the dashboard.
  if (user.email_verified && !PHONE_VERIFICATION_ENABLED) {
    finish();
    return null;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        {PHONE_VERIFICATION_ENABLED && <Stepper current={step} user={user} />}

        {step === 'email' && (
          <EmailStep
            user={user}
            onVerified={async (auth) => {
              applyAuth(auth);
              if (PHONE_VERIFICATION_ENABLED) {
                setStep('phone');
              } else {
                // No phone step — straight to the dashboard.
                await refreshUser().catch(() => {});
                finish();
              }
            }}
          />
        )}

        {step === 'phone' && PHONE_VERIFICATION_ENABLED && (
          <PhoneStep
            user={user}
            onVerified={(auth) => {
              applyAuth(auth);
              finish();
            }}
            onSkip={async () => {
              // Make sure our local user is up to date before we leave.
              await refreshUser().catch(() => {});
              finish();
            }}
          />
        )}

        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
          {t('Signed in as')} <span className="font-medium">{user.email}</span>.{' '}
          <button onClick={logout} className="text-brand-700 hover:underline">
            {t('Sign out')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ current, user }) {
  const t = useT();
  const emailDone = user.email_verified;
  const phoneDone = user.phone_verified;
  return (
    <div className="flex items-center gap-3 text-sm">
      <StepPill done={emailDone} active={current === 'email'} label={t('1. Email')} />
      <div className="h-px flex-1 bg-slate-200" />
      <StepPill done={phoneDone} active={current === 'phone'} label={t('2. Phone')} />
    </div>
  );
}

function StepPill({ done, active, label }) {
  let cls = 'px-3 py-1 rounded-full border text-xs font-medium';
  if (done) cls += ' bg-emerald-50 border-emerald-200 text-emerald-800';
  else if (active) cls += ' bg-brand-50 border-brand-200 text-brand-800';
  else cls += ' bg-slate-50 border-slate-200 text-slate-600';
  return <span className={cls}>{done ? '✓ ' : ''}{label}</span>;
}

// ─── Email step ─────────────────────────────────────────────────
function EmailStep({ user, onVerified }) {
  const t = useT();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(null); // 'sending' | 'sent' | null
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Auto-send the first code when this step opens — the register endpoint
  // already sent one, but re-sending here guarantees the user has a valid
  // live code in case they wait past the expiry.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api('/auth/email/send-code', { method: 'POST', body: {} });
        if (!cancelled) { setSent(true); setStatus('sent'); }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function resend() {
    setStatus('sending');
    setError(null);
    try {
      await api('/auth/email/send-code', { method: 'POST', body: {} });
      setStatus('sent');
      setSent(true);
    } catch (err) {
      setError(err.message);
      setStatus(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = await api('/auth/email/verify', {
        method: 'POST',
        body: { code: code.trim() },
      });
      onVerified(auth);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t('Verify your email')}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {t('We sent a 6-digit code to')} <span className="font-medium">{user.email}</span>.
        {' '}{t('Enter it below to finish setting up your account.')}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="field">
          <label>{t('Verification code')}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="tracking-widest text-lg"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status === 'sent' && !error && (
          <p className="text-sm text-emerald-700">{t('Code sent. Check your inbox.')}</p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy || code.length < 4}>
          {busy ? t('Verifying…') : t('Verify email')}
        </button>
      </form>

      <button onClick={resend} className="mt-3 text-sm text-brand-700 hover:underline">
        {sent ? t('Resend code') : t('Send code')}
      </button>
    </div>
  );
}

// ─── Phone step (optional) ─────────────────────────────────────
function PhoneStep({ user, onVerified, onSkip }) {
  const t = useT();
  const [phone, setPhone] = useState(user.phone || '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [sentPhone, setSentPhone] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const resp = await api('/auth/phone/send-code', {
        method: 'POST',
        body: { phone },
      });
      setSent(true);
      setSentPhone(resp.phone || phone);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = await api('/auth/phone/verify', {
        method: 'POST',
        body: { code: code.trim() },
      });
      onVerified(auth);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t('Verify your phone')}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {t('Optional, but recommended — we\'ll text you about rental pickups and repair updates.')}
      </p>

      {!sent ? (
        <form onSubmit={sendCode} className="mt-6 space-y-4">
          <div className="field">
            <label>{t('Mobile number')}</label>
            <input
              type="tel"
              placeholder="(630) 555-0123"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              {t('US numbers are formatted automatically. Include + and country code for international.')}
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? t('Sending…') : t('Send SMS code')}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">
            {t('Code sent to')} <span className="font-medium">{sentPhone}</span>.
          </p>
          <div className="field">
            <label>{t('Verification code')}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="tracking-widest text-lg"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || code.length < 4}>
            {busy ? t('Verifying…') : t('Verify phone')}
          </button>
          <button
            type="button"
            className="text-sm text-slate-600 hover:underline"
            onClick={() => { setSent(false); setCode(''); setError(null); }}
          >
            {t('Change phone number')}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-slate-200">
        <button onClick={onSkip} className="btn-secondary w-full">
          {t('Skip for now')}
        </button>
        <p className="mt-2 text-xs text-slate-500 text-center">
          {t('You can verify your phone later from your dashboard.')}
        </p>
      </div>
    </div>
  );
}
