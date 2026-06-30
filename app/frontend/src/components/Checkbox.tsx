import React from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  id?: string;
  className?: string;
}

export function Checkbox({ checked, onChange, label, id, className = '' }: CheckboxProps) {
  return (
    <label className={`inline-flex cursor-pointer select-none items-center gap-2 ${className}`}>
      <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-sm border border-border bg-surface transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-gold peer-focus-visible:ring-offset-1" />
        <svg
          className="pointer-events-none absolute h-2.5 w-2.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 10 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="1 4 3.5 6.5 9 1" />
        </svg>
      </span>
      {label && <span className="text-sm font-medium text-primary">{label}</span>}
    </label>
  );
}
