import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

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
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-sm px-3 py-2.5 text-sm text-primary bg-bg focus:outline-none focus:ring-2 focus:ring-primary-gold/40"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm text-primary mb-1" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-border rounded-sm px-3 py-2.5 text-sm text-primary bg-bg focus:outline-none focus:ring-2 focus:ring-primary-gold/40"
              placeholder="••••••••"
            />
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
