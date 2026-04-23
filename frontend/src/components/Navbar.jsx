import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/i18n.jsx';
import logoUrl from '../assets/logo.svg';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  const dashboardPath = user
    ? user.role === 'admin' ? '/admin'
      : user.role === 'mechanic' ? '/mechanic'
        : '/client'
    : null;

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-4">
        <Link to="/" aria-label="AG Truck & Trailer Rental — Home" className="flex items-center shrink-0">
          <img
            src={logoUrl}
            alt="AG Truck & Trailer Rental"
            className="h-10 sm:h-24 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language toggle — tiny pill switcher. */}
          <div
            role="group"
            aria-label={t('Language')}
            className="inline-flex rounded-full border border-slate-200 bg-white text-xs font-semibold overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              className={
                'px-2 py-1 transition ' +
                (lang === 'en'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100')
              }
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('ru')}
              className={
                'px-2 py-1 transition ' +
                (lang === 'ru'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100')
              }
              aria-pressed={lang === 'ru'}
            >
              RU
            </button>
          </div>

          {user ? (
            <>
              <Link
                to={dashboardPath}
                className="text-sm text-slate-700 hover:text-brand-700 whitespace-nowrap"
              >
                {t('Dashboard')}
              </Link>
              <span className="hidden sm:inline text-sm text-slate-500 whitespace-nowrap">
                {user.name} · <span className="capitalize">{user.role}</span>
              </span>
              <button onClick={handleLogout} className="btn-secondary !px-3 sm:!px-4 whitespace-nowrap">
                {t('Log out')}
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="btn-secondary !px-3 sm:!px-4 whitespace-nowrap">
                {t('Register')}
              </Link>
              <Link to="/login" className="btn-primary !px-3 sm:!px-4 whitespace-nowrap">
                {t('Log in')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
