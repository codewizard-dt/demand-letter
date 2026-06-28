import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-3">Page not found</h1>
      <p className="text-text-muted mb-6">
        The page you requested does not exist.
      </p>
      <Link to="/" className="text-primary underline">
        Go to Jobs
      </Link>
    </div>
  );
}
