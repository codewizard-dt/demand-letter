import { Link } from 'react-router-dom';

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorCard({ message, onRetry }: Props) {
  return (
    <div className="max-w-md mx-auto mt-16 p-6 border border-red-200 rounded-lg bg-red-50 text-center">
      <p className="text-sm font-medium text-red-700 mb-4">{message}</p>
      <div className="flex justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        )}
        <Link
          to="/"
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-primary"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
