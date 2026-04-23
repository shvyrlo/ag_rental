import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useT } from '../i18n/i18n.jsx';

export default function Register() {
  const t = useT();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await register(form);
      // New accounts land on /verify until email is confirmed.
      navigate('/verify', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t('Create a client account')}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t('We\'ll email you a code to confirm your address. Phone is optional — we use it to reach you about your rental.')}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="field">
            <label>{t('Full name')}</label>
            <input type="text" required value={form.name} onChange={update('name')} />
          </div>
          <div className="field">
            <label>{t('Email')}</label>
            <input type="email" required value={form.email} onChange={update('email')} />
          </div>
          <div className="field">
            <label>{t('Phone')} <span className="text-slate-400 font-normal">{t('(optional)')}</span></label>
            <input
              type="tel"
              placeholder="(630) 555-0123"
              value={form.phone}
              onChange={update('phone')}
            />
          </div>
          <div className="field">
            <label>{t('Password')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={update('password')}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t('Creating…') : t('Create account')}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          {t('Already have an account?')}{' '}
          <Link to="/login" className="text-brand-700 hover:underline">{t('Log in')}</Link>
        </p>
      </div>
    </div>
  );
}
