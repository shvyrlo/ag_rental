import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import logoUrl from '../assets/logo.svg';

export default function Navbar() {
  const { user, logout } = useAuth();
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
        <Link to="/" aria-label="AG Truck &amp; Trailer Rental — Home" className="flex items-center shrink-0">
          <img
            src={logoUrl}
            alt="AG Truck &amp; Trailer Rental"
            className="h-10 sm:h-24 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <>
              <Link
                to={dashboardPath}
                className="text-sm text-slate-700 hover:text-brand-700 whitespace-nowrap"
              >
                Dashboard
              </Link>
              <span className="hidden sm:inline text-sm text-slate-500 whitespace-nowrap">
                {user.name} · <span className="capitalize">{user.role}</span>
              </span>
              <button onClick={handleLogout} className="btn-secondary !px-3 sm:!px-4 whitespace-nowrap">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="btn-secondary !px-3 sm:!px-4 whitespace-nowrap">
                Register
              </Link>
              <Link to="/login" className="btn-primary !px-3 sm:!px-4 whitespace-nowrap">
                Log in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
