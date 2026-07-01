import { forwardRef, type HTMLAttributes } from 'react';

export type ZoneDisplayType = 'boilerplate' | 'variable' | 'mixed' | null;

interface ZoneCardProps extends HTMLAttributes<HTMLDivElement> {
  zoneIndex: number;
  zoneType: ZoneDisplayType;
  variableName?: string;
  variableNames?: string[];
  part?: 'header' | 'body' | 'footer';
  stationaryVariant?: string;
  /** When true, changes "all pages" badge to "subsequent pages" */
  isSubsequentHeader?: boolean;
  /** Override type-based border + background color classes (for state-driven styling) */
  colorClass?: string;
}

export const ZoneCard = forwardRef<HTMLDivElement, ZoneCardProps>(
  function ZoneCard({ zoneIndex, zoneType, variableName, variableNames, part, stationaryVariant, isSubsequentHeader, colorClass, className, children, ...rest }, ref) {
    const color = colorClass ?? (
      zoneType === 'variable' || zoneType === 'mixed'
        ? 'border-blue-300 bg-blue-50'
        : zoneType === 'boilerplate'
          ? 'border-gray-300 bg-gray-100/60'
          : 'border-gray-200 bg-gray-50'
    );
    const showPartBadge = part === 'header' || part === 'footer';

    return (
      <div
        ref={ref}
        className={`rounded border ${color}${className ? ` ${className}` : ''}`}
        {...rest}
      >
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium text-gray-500">Zone {zoneIndex}</span>
          {variableNames && variableNames.length > 0 ? (
            <span className="font-mono text-xs text-gray-400">
              {variableNames.map((name, i) => (
                <span key={name + `-${i}`}>{i > 0 ? ' · ' : ''}{`{${name}}`}</span>
              ))}
            </span>
          ) : variableName ? (
            <span className="font-mono text-xs text-gray-400">{`{${variableName}}`}</span>
          ) : null}
          {showPartBadge && (
            <span className="ml-auto px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700   border border-gray-200">
              {part === 'header' ? 'header' : 'footer'}
              {stationaryVariant && stationaryVariant !== 'default'
                ? ` (${stationaryVariant} page only)`
                : isSubsequentHeader ? ' (subsequent pages)' : ' (all pages)'}
            </span>
          )}
        </div>
        {children}
      </div>
    );
  },
);
