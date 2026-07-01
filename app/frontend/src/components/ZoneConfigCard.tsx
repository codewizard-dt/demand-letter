import { forwardRef, type MutableRefObject } from 'react';
import { VariableComboBox } from './VariableComboBox';
import { ZoneCard } from './ZoneCard';
import type { Zone } from '../lib/api';

type ZoneImage = NonNullable<NonNullable<Zone['runPath']>['images']>[number];

interface ZoneConfigCardProps {
  zone: Zone;
  isRemoved: boolean;
  isFlashing: boolean;
  templateError: string | null;
  editFocusRef: MutableRefObject<string | null>;
  onUpdateZone: (patch: Partial<Zone>) => void;
  onRemove: () => void;
  onRestore: () => void;
  onSetTemplateError: (error: string | null) => void;
  isSubsequentHeader?: boolean;
  allVariables: string[];
  onReplaceImage?: (target: string, file: File) => void;
}

function getDisplayType(zone: Zone): 'boilerplate' | 'variable' | 'mixed' {
  if (zone.type === 'boilerplate_verbatim') return 'boilerplate';
  if (zone.type === 'variable_populated' && zone.templateText) return 'mixed';
  return 'variable';
}

function isNewLineZone(zone: Zone): boolean {
  return zone.textContent.trim().length === 0;
}

function renderZoneImages(
  images: ZoneImage[] | undefined,
  onReplaceImage?: (target: string, file: File) => void,
) {
  if (!images || images.length === 0) return null;
  return (
    <span className="mt-2 flex flex-col gap-2">
      {images.map((image) => (
        <span
          key={`${image.relId}-${image.target}`}
          className="group relative inline-flex w-fit"
          onDragOver={onReplaceImage ? (e) => { e.preventDefault(); } : undefined}
          onDrop={onReplaceImage
            ? (e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file?.type.startsWith('image/')) onReplaceImage(image.target, file);
            }
            : undefined}
        >
          <img
            src={image.dataUrl}
            alt={image.target.split('/').pop() ?? 'Embedded document image'}
            className="max-h-24 max-w-full object-contain"
          />
          {onReplaceImage && (
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 px-2 text-center text-[11px] font-medium text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100">
              Drop or click to replace
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onReplaceImage(image.target, file);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          )}
        </span>
      ))}
    </span>
  );
}

function getZoneImages(zone: Zone): ZoneImage[] {
  const images = [
    ...(zone.runPath?.images ?? []),
    ...(zone.runPath?.runs?.flatMap((run) => run.images ?? []) ?? []),
  ];
  return images.filter((image, index, all) => (
    all.findIndex((candidate) => candidate.relId === image.relId && candidate.target === image.target) === index
  ));
}

function isImagePlaceholderText(zone: Zone): boolean {
  return getZoneImages(zone).length > 0 && /^(header|document|footer) image$/i.test(zone.textContent.trim());
}

function toSnakeCase(text: string): string {
  const firstWord = text.trim().split(/\s+/)[0] ?? '';
  return firstWord
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

function isPageCountZone(zone: Zone): boolean {
  return /^page\s+\d+\s+of\s+\d+$/i.test(zone.textContent.trim());
}

function defaultFieldName(zone: Zone): string {
  if (isPageCountZone(zone)) return 'pageCount';
  if (zone.part === 'header') return `header_${zone.zoneIndex}`;
  return toSnakeCase(zone.textContent);
}

function defaultTemplateText(zone: Zone): string {
  return isPageCountZone(zone) ? 'Page {pageNumber} of {pageCount}' : zone.textContent;
}

export const ZoneConfigCard = forwardRef<HTMLDivElement, ZoneConfigCardProps>(
  function ZoneConfigCard(
    {
      zone,
      isRemoved,
      isFlashing,
      templateError,
      editFocusRef,
      onUpdateZone,
      onRemove,
      onRestore,
      onSetTemplateError,
      isSubsequentHeader,
      allVariables,
      onReplaceImage,
    },
    ref,
  ) {
    const displayType = getDisplayType(zone);

    const suggestedFieldName = zone.suggestedFieldName ?? defaultFieldName(zone);

    const detectedVars = zone.templateText
      ? [...zone.templateText.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g)].map((m) => m[1]).filter((v): v is string => v !== undefined)
      : [];

    function updateZoneText(text: string) {
      const runs = zone.runPath?.runs;
      const nextRunPath = zone.runPath && runs && runs.length > 0
        ? {
          ...zone.runPath,
          runs: runs.map((run, index) => ({
            ...run,
            text: index === 0 ? text : '',
          })),
        }
        : zone.runPath;
      onUpdateZone({ textContent: text, ...(nextRunPath !== undefined ? { runPath: nextRunPath } : {}), confirmed: false });
    }

    const colorClass = isRemoved
      ? 'border-red-300 bg-red-50'
      : isFlashing
        ? 'border-primary bg-white ring-2 ring-primary/40'
        : zone.type === 'boilerplate_verbatim'
          ? zone.confirmed
            ? 'border-gray-300/70 bg-gray-100/60'
            : 'border-gray-300 bg-gray-50/80'
          : zone.confirmed
            ? 'border-blue-400 bg-blue-50'
            : 'border-yellow-400 bg-yellow-50/50';

    return (
      <ZoneCard
        ref={ref}
        zoneIndex={zone.zoneIndex}
        zoneType={displayType}
        {...(zone.part != null ? { part: zone.part } : {})}
        {...(zone.stationaryVariant != null ? { stationaryVariant: zone.stationaryVariant } : {})}
        {...(isSubsequentHeader != null ? { isSubsequentHeader } : {})}
        colorClass={colorClass}
        className="p-4 transition-[border-color,box-shadow,background-color] duration-200"
      >
        <div className="mb-3">
          {getZoneImages(zone).length > 0 && (
            <div className="mb-3 rounded border border-gray-200 bg-white p-2">
              {renderZoneImages(getZoneImages(zone), onReplaceImage)}
            </div>
          )}
          {displayType === 'boilerplate' && !isNewLineZone(zone) && !isImagePlaceholderText(zone) ? (
            <div
              contentEditable
              suppressContentEditableWarning
              onFocus={(e) => { editFocusRef.current = e.currentTarget.innerText; }}
              onBlur={(e) => {
                const next = e.currentTarget.innerText;
                if (next !== editFocusRef.current) updateZoneText(next);
                editFocusRef.current = null;
              }}
              aria-label={`Zone ${zone.zoneIndex} boilerplate text`}
              className="w-full rounded border border-transparent px-2 py-1.5 font-mono text-sm leading-5 text-gray-900 outline-none whitespace-pre-wrap break-words cursor-text hover:border-gray-200 hover:bg-gray-50/60 focus:border-gray-300 focus:bg-white focus:ring-1 focus:ring-primary"
            >
              {zone.textContent}
            </div>
          ) : (displayType === 'mixed' || displayType === 'variable') && !isNewLineZone(zone) && !isImagePlaceholderText(zone) ? (
            <>
              <div
                contentEditable
                suppressContentEditableWarning
                onFocus={(e) => { editFocusRef.current = e.currentTarget.innerText; }}
                onBlur={(e) => {
                  const text = e.currentTarget.innerText;
                  const changed = text !== editFocusRef.current;
                  editFocusRef.current = null;
                  if (changed) {
                    const matches = [...text.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g)].map((m) => m[1]);
                    const firstMatch = matches[0] ?? null;
                    onUpdateZone({ templateText: text || null, suggestedFieldName: firstMatch, confirmed: zone.confirmed });
                  }
                  onSetTemplateError(null);
                }}
                aria-label={`Zone ${zone.zoneIndex} template text`}
                className="w-full rounded border border-gray-200 px-2 py-1.5 font-mono text-sm leading-5 text-gray-900 outline-none whitespace-pre-wrap break-words cursor-text hover:border-gray-300 hover:bg-gray-50/60 focus:border-gray-400 focus:bg-white focus:ring-1 focus:ring-primary"
              >
                {zone.templateText ?? (zone.suggestedFieldName ? `{${zone.suggestedFieldName}}` : '')}
              </div>
              {detectedVars.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                  <span>Variables detected:</span>
                  {detectedVars.map((v, i) => (
                    <span key={v + `-${i}`} className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 font-mono text-blue-700">
                      {`{${v}}`}
                    </span>
                  ))}
                </div>
              )}
              {templateError && (
                <p className="mt-1 text-xs text-red-600">{templateError}</p>
              )}
            </>
          ) : null}

        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {isRemoved ? (
            <button
              type="button"
              onClick={onRestore}
              className="px-3 py-1 text-sm rounded border ml-auto bg-red-100 border-red-400 text-red-700"
            >
              Keep
            </button>
          ) : isNewLineZone(zone) ? (
            <>
              <span className="px-3 py-1 text-sm rounded italic   opacity-60">
                New line
              </span>
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-1 text-sm rounded border ml-auto border-gray-300"
              >
                Remove
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              {/* Row 1: type toggle */}
              <div className="flex   rounded-full border border-gray-300 bg-white p-0.5 self-start">
                {(['boilerplate', 'variable', 'mixed'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (opt === 'boilerplate') {
                        onUpdateZone({ type: 'boilerplate_verbatim', suggestedFieldName: suggestedFieldName, templateText: null, confirmed: false });
                      } else if (opt === 'variable') {
                        const fromBoilerplate = displayType === 'boilerplate';
                        onUpdateZone({ type: 'variable_populated', templateText: null, confirmed: false, ...(fromBoilerplate ? { suggestedFieldName: suggestedFieldName } : {}) });
                      } else {
                        const fromBoilerplate = displayType === 'boilerplate';
                        onUpdateZone({ type: 'variable_populated', templateText: zone.templateText ?? defaultTemplateText(zone), confirmed: false, ...(fromBoilerplate ? { suggestedFieldName: suggestedFieldName } : {}) });
                      }
                      onSetTemplateError(null);
                    }}
                    className={`px-3 py-1 text-sm rounded-full capitalize ${displayType === opt ? 'bg-primary text-white' : 'text-gray-700'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {/* Row 2: insert variable (for non-boilerplate) + confirm + remove */}
              <div className="flex items-center gap-2">
                {displayType !== 'boilerplate' && (
                  <div className="flex-1 min-w-0">
                    <VariableComboBox
                      variables={allVariables}
                      onAdd={(varName) => {
                        const newText = (zone.templateText ?? '') + `{${varName}}`;
                        const firstMatch = [...newText.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g)].map(m => m[1]).filter((v): v is string => v !== undefined)[0] ?? null;
                        onUpdateZone({ templateText: newText, suggestedFieldName: firstMatch });
                      }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <button
                    onClick={() => { onUpdateZone({ confirmed: !zone.confirmed }); }}
                    className={`px-3 py-1 text-sm rounded border ${zone.confirmed ? 'bg-teal-100 border-teal-400' : 'border-gray-300'}`}
                  >
                    {zone.confirmed ? 'Confirmed ✓' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    className="px-3 py-1 text-sm rounded border border-gray-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </ZoneCard>
    );
  },
);
