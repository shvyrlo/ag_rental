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
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" aria-label="AG Truck &amp; Trailer Rental — Home" className="flex items-center">
          <img
            src={logoUrl}
            alt="AG Truck &amp; Trailer Rental"
            className="h-20 sm:h-24 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={dashboardPath}
                className="text-sm text-slate-700 hover:text-brand-700"
              >
                Dashboard
              </Link>
              <span className="hidden sm:inline text-sm text-slate-500">
                {user.name} · <span className="capitalize">{user.role}</span>
              </span>
              <button onClick={handleLogout} className="btn-secondary">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="btn-secondary">
                Register
              </Link>
              <Link to="/login" className="btn-primary">
                Log in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
