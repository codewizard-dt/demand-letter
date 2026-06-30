import { forwardRef, type CSSProperties } from 'react';
import { ZoneCard } from './ZoneCard';
import type { Zone } from '../lib/api';

type ZoneRun = NonNullable<NonNullable<Zone['runPath']>['runs']>[number];
type ZoneImage = NonNullable<NonNullable<Zone['runPath']>['images']>[number];

interface ZonePreviewCardProps {
  zone: Zone;
  isRemoved: boolean;
  onClick: () => void;
  isSubsequentHeader?: boolean;
}

function getRunStyle(run: ZoneRun): CSSProperties {
  return {
    fontWeight: run.bold ? 700 : undefined,
    fontStyle: run.italic ? 'italic' : undefined,
    textDecoration: run.underline ? 'underline' : undefined,
    fontFamily: run.font,
    fontSize: run.fontSize ? `${run.fontSize}pt` : undefined,
  };
}

function renderZoneImages(images: ZoneImage[] | undefined) {
  if (!images || images.length === 0) return null;
  return (
    <span className="mt-2 flex flex-col gap-2">
      {images.map((image) => (
        <img
          key={`${image.relId}-${image.target}`}
          src={image.dataUrl}
          alt={image.target.split('/').pop() ?? 'Embedded document image'}
          className="max-h-24 max-w-full object-contain"
        />
      ))}
    </span>
  );
}

function renderZoneContent(zone: Zone) {
  const runs = zone.runPath?.runs?.filter((run) => run.text.length > 0 || (run.images?.length ?? 0) > 0);
  if (!runs || runs.length === 0) {
    return zone.textContent ? (
      <>
        {zone.textContent}
        {renderZoneImages(zone.runPath?.images)}
      </>
    ) : <span className="text-gray-400">New line</span>;
  }
  return runs.map((run) => (
    <span key={run.runIndex} style={getRunStyle(run)}>
      {run.text}
      {renderZoneImages(run.images)}
    </span>
  ));
}

export const ZonePreviewCard = forwardRef<HTMLDivElement, ZonePreviewCardProps>(
  function ZonePreviewCard({ zone, isRemoved, onClick, isSubsequentHeader }, ref) {
    const align = zone.runPath?.paragraph?.alignment;
    const zoneType =
      zone.type === 'variable_populated' && zone.templateText ? 'mixed'
      : zone.type === 'variable_populated' ? 'variable'
      : zone.type === 'boilerplate_verbatim' ? 'boilerplate'
      : null;

    return (
      <ZoneCard
        ref={ref}
        zoneIndex={zone.zoneIndex}
        zoneType={zoneType}
        {...(zone.suggestedFieldName != null ? { variableName: zone.suggestedFieldName } : {})}
        {...(zone.part != null ? { part: zone.part } : {})}
        {...(zone.stationaryVariant != null ? { stationaryVariant: zone.stationaryVariant } : {})}
        {...(isSubsequentHeader != null ? { isSubsequentHeader } : {})}
        {...(isRemoved ? { colorClass: 'border-red-200 bg-red-50 text-red-700' } : {})}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={`cursor-pointer px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary${isRemoved ? ' line-through' : ''}`}
        style={{ textAlign: (align === 'both' ? 'justify' : align) as CSSProperties['textAlign'] }}
      >
        {renderZoneContent(zone)}
      </ZoneCard>
    );
  },
);
