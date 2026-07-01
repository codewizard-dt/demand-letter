import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  className?: string;
  "aria-hidden"?: boolean;
}

export default function LoadingSpinner({ className = 'h-4 w-4', "aria-hidden": ariaHidden = true }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={`animate-spin ${className}`}
      aria-hidden={ariaHidden}
    />
  );
}
