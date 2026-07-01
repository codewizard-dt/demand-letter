import type { CSSProperties } from 'react';
import { ZoneCard } from './ZoneCard';
import type { Zone } from '../lib/api';

interface ZoneOutputCardProps {
  zone: Zone;
  content?: string;
}

export function ZoneOutputCard({ zone, content }: ZoneOutputCardProps) {
  const align = zone.runPath?.paragraph?.alignment;
  const zoneType =
    zone.type === 'variable_populated' ? 'variable'
    : zone.type === 'boilerplate_verbatim' ? 'boilerplate'
    : null;

  const templateVars = zone.templateText
    ? [...zone.templateText.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g)].map((m) => m[1]).filter((v): v is string => v !== undefined)
    : [];

  return (
    <ZoneCard
      zoneIndex={zone.zoneIndex}
      zoneType={zoneType}
      {...(templateVars.length > 0
        ? { variableNames: templateVars }
        : zone.suggestedFieldName != null
          ? { variableName: zone.suggestedFieldName }
          : {}
      )}
      {...(zone.part != null ? { part: zone.part } : {})}
      {...(zone.stationaryVariant != null ? { stationaryVariant: zone.stationaryVariant } : {})}
      style={{ textAlign: (align === 'both' ? 'justify' : align) as CSSProperties['textAlign'] }}
      className="px-3 py-2"
    >
      {content != null ? (
        content || <span className="text-gray-300">​</span>
      ) : (
        <div className="animate-pulse space-y-1.5">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      )}
    </ZoneCard>
  );
}
