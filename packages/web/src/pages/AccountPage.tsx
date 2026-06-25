import { useAuth } from '../lib/auth';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AccountPage() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <p className="text-[12px] font-normal uppercase tracking-[1px] text-primary-gold mb-2">
        Your profile
      </p>
      <h1 className="font-serif text-4xl text-primary mb-8">Account</h1>

      <div className="bg-surface border border-border rounded-md shadow-sm p-6 flex items-center gap-5 mb-6">
        <div className="w-14 h-14 rounded-full bg-primary-gold text-white text-xl font-medium flex items-center justify-center shrink-0">
          {initials(user?.name ?? 'U')}
        </div>
        <div>
          <p className="font-medium text-primary">{user?.name}</p>
          <p className="text-sm text-text-muted">{user?.email}</p>
        </div>
      </div>

      <button
        onClick={logout}
        className="border border-border rounded-lg px-5 py-2.5 text-[12px] uppercase tracking-[0.25px] text-primary font-normal hover:bg-border/40 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
