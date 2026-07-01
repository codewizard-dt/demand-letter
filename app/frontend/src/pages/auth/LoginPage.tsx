import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function LoginPage() {
  useDocumentTitle('Sign In — Steno');
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login(email, password);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-md shadow-md p-8 w-full max-w-md">
        <p className="text-[12px] font-normal uppercase tracking-[1px] text-primary-gold mb-2">
          Welcome back
        </p>
        <h2 className="font-serif text-3xl text-primary mb-6">Sign in to Steno</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-primary mb-1" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              className="w-full border border-border rounded-sm px-3 py-2.5 text-sm text-primary bg-bg focus:outline-none focus:ring-2 focus:ring-primary-gold/40"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-primary mb-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); }}
                className="w-full border border-border rounded-sm px-3 py-2.5 text-sm text-primary bg-bg focus:outline-none focus:ring-2 focus:ring-primary-gold/40"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => { setShowPassword(v => !v); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-primary-gold hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don&rsquo;t have an account?{' '}
          <Link to="/register" className="text-primary-gold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
