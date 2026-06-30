import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AuthLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="bg-primary h-14 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/steno-logo.svg" alt="Steno" className="h-8 w-auto brightness-0 invert" />
            <span className="font-serif text-white text-sm tracking-widest">STENO</span>
          </Link>
          <nav className="flex items-center gap-1">
            {[
              { to: '/', label: 'Demand Letters', exact: true },
              { to: '/documents', label: 'Documents', exact: false },
            ].map(({ to, label, exact }) => {
              const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-9 h-9 rounded-full bg-primary-gold text-white text-sm font-medium flex items-center justify-center select-none hover:opacity-90 transition-opacity"
            aria-label="Open user menu"
          >
            {initials(user?.name ?? 'U')}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-border rounded-md shadow-md z-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
              </div>
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  location.pathname === '/account'
                    ? 'text-primary font-medium bg-bg'
                    : 'text-primary hover:bg-bg'
                }`}
              >
                Account
              </Link>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-bg transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
