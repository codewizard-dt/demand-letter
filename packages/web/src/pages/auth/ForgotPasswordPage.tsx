import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset Password — Steno');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-md shadow-md p-8 w-full max-w-md">
        <p className="text-[12px] font-normal uppercase tracking-[1px] text-primary-gold mb-2">
          Account recovery
        </p>
        <h2 className="font-serif text-3xl text-primary mb-2">Reset your password</h2>
        <p className="text-sm text-text-muted mb-6">
          Enter your email and we&rsquo;ll send you a reset link.
        </p>

        {sent ? (
          <div className="px-4 py-4 rounded-sm bg-green-50 border border-green-200 text-sm text-green-800">
            If that email address is registered, you&rsquo;ll receive a reset link shortly.
          </div>
        ) : (
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
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border rounded-sm px-3 py-2.5 text-sm text-primary bg-bg focus:outline-none focus:ring-2 focus:ring-primary-gold/40"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
            >
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link to="/login" className="text-primary-gold hover:underline">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
