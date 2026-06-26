import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function passwordStrength(pw: string): 'weak' | 'moderate' | 'strong' {
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
  if (pw.length >= 12 && hasLower && hasUpper && hasDigit && hasSymbol) return 'strong';
  if (pw.length >= 8 && ((hasLower && hasUpper) || hasDigit)) return 'moderate';
  return 'weak';
}

export default function RegisterPage() {
  useDocumentTitle('Create Account — Steno');
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    register(name, email, password);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-md shadow-md p-8 w-full max-w-md">
        <p className="text-[12px] font-normal uppercase tracking-[1px] text-primary-gold mb-2">
          Get started
        </p>
        <h2 className="font-serif text-3xl text-primary mb-6">Create your account</h2>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-sm bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-primary mb-1" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border rounded-sm px-3 py-2.5 text-sm text-primary bg-bg focus:outline-none focus:ring-2 focus:ring-primary-gold/40"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm text-primary mb-1" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2.5 text-sm text-primary bg-bg focus:outline-none focus:ring-2 focus:ring-primary-gold/40"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {password.length > 0 && (() => {
              const strength = passwordStrength(password);
              return (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    <div className={`h-1 flex-1 rounded ${strength === 'weak' ? 'bg-red-400' : 'bg-green-400'}`} />
                    <div className={`h-1 flex-1 rounded ${strength === 'moderate' || strength === 'strong' ? 'bg-green-400' : 'bg-gray-200'}`} />
                    <div className={`h-1 flex-1 rounded ${strength === 'strong' ? 'bg-green-600' : 'bg-gray-200'}`} />
                  </div>
                  <p className={`text-[11px] mt-0.5 ${strength === 'weak' ? 'text-red-500' : strength === 'moderate' ? 'text-amber-600' : 'text-green-600'}`}>
                    {strength === 'weak' ? 'Weak' : strength === 'moderate' ? 'Moderate' : 'Strong'}
                  </p>
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-sm text-primary mb-1" htmlFor="confirm">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2.5 text-sm text-primary bg-bg focus:outline-none focus:ring-2 focus:ring-primary-gold/40"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-primary"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="text-[11px] text-red-500 mt-0.5">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary-gold text-white rounded-lg py-2.5 text-[12px] uppercase tracking-[0.25px] font-normal hover:opacity-90 transition-opacity"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
