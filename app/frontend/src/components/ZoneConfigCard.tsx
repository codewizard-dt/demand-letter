import { forwardRef, type MutableRefObject } from 'react';
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
}

function getDisplayType(zone: Zone): 'boilerplate' | 'variable' | 'mixed' {
  if (zone.type === 'boilerplate_verbatim') return 'boilerplate';
  if (zone.type === 'variable_populated' && zone.templateText) return 'mixed';
  return 'variable';
}

function isNewLineZone(zone: Zone): boolean {
  return zone.textContent.trim().length === 0;
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

function getBoilerplateWarnings(zone: Zone): string[] {
  if (zone.type !== 'boilerplate_verbatim' || isNewLineZone(zone)) return [];
  const text = zone.textContent.trim();
  const warnings: string[] = [];
  if (/([a-z])([A-Z][a-z])/.test(text)) {
    warnings.push('Possible missing space between words.');
  }
  if (/[A-Za-z]\d|\d[A-Za-z]/.test(text)) {
    warnings.push('Possible missing space between text and number.');
  }
  if (/\s{2,}/.test(text)) {
    warnings.push('Repeated spacing.');
  }
  if (/^[a-z]/.test(text) && text.length > 12) {
    warnings.push('Starts with a lowercase letter.');
  }
  if (text.length > 40 && !/[.!?:;)"'\]]$/.test(text)) {
    warnings.push('May be missing ending punctuation.');
  }
  return warnings;
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
    },
    ref,
  ) {
    const displayType = getDisplayType(zone);

    const suggestedFieldName = zone.suggestedFieldName ?? defaultFieldName(zone);

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
        : zone.confirmed
          ? 'border-teal-400/50 bg-teal-50/50'
          : 'border-yellow-400 bg-yellow-50/50';

    return (
      <ZoneCard
        ref={ref}
        zoneIndex={zone.zoneIndex}
        zoneType={displayType}
        variableName={suggestedFieldName}
        {...(zone.part != null ? { part: zone.part } : {})}
        {...(zone.stationaryVariant != null ? { stationaryVariant: zone.stationaryVariant } : {})}
        {...(isSubsequentHeader != null ? { isSubsequentHeader } : {})}
        colorClass={colorClass}
        className="p-4 transition-[border-color,box-shadow,background-color] duration-200"
      >
        <div className="mb-3">
          {getZoneImages(zone).length > 0 && (
            <div className="mb-3 rounded border border-gray-200 bg-white p-2">
              {renderZoneImages(getZoneImages(zone))}
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
          ) : displayType === 'mixed' ? (
            <>
              <div
                contentEditable
                suppressContentEditableWarning
                onFocus={(e) => { editFocusRef.current = e.currentTarget.innerText; }}
                onBlur={(e) => {
                  let text = e.currentTarget.innerText;
                  if (text.includes(`{}`) && !text.includes(`{${suggestedFieldName}}`)) {
                    text = text.replace(`{}`, `{${suggestedFieldName}}`);
                  }
                  const changed = text !== editFocusRef.current;
                  editFocusRef.current = null;
                  if (changed) onUpdateZone({ templateText: text || null, confirmed: zone.confirmed });
                  const fieldName = suggestedFieldName;
                  const error = fieldName && !text.includes(`{${fieldName}}`)
                    ? `Must contain {${fieldName}} as a placeholder`
                    : null;
                  onSetTemplateError(error);
                }}
                aria-label={`Zone ${zone.zoneIndex} mixed template text`}
                className={`w-full rounded border px-2 py-1.5 font-mono text-sm leading-5 text-gray-900 outline-none whitespace-pre-wrap break-words cursor-text hover:bg-gray-50/60 focus:bg-white focus:ring-1 ${templateError ? 'border-red-300 hover:border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-primary'}`}
              >
                {zone.templateText ?? ''}
              </div>
              {templateError && (
                <p className="mt-1 text-xs text-red-600">{templateError}</p>
              )}
            </>
          ) : !isNewLineZone(zone) && !isImagePlaceholderText(zone) ? (
            <p className="rounded border border-transparent px-2 py-1.5 font-mono text-sm leading-5">
              {suggestedFieldName
                ? `{${suggestedFieldName}}`
                : <span className="italic text-gray-400 opacity-60">Define field name</span>
              }
            </p>
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
              {/* Row 2: field name (fills) + confirm + remove (right-aligned) */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={suggestedFieldName}
                  onChange={(e) => onUpdateZone({ suggestedFieldName: e.target.value })}
                  disabled={displayType === 'boilerplate'}
                  placeholder={suggestedFieldName}
                  className="st-zone-field-input border rounded px-2 py-1 text-sm flex-1 min-w-0"
                />
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <button
                    onClick={() => onUpdateZone({ confirmed: !zone.confirmed })}
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
        {getBoilerplateWarnings(zone).length > 0 && (
          <div className="mt-2 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            <p className="font-semibold">Boilerplate needs review</p>
            <ul className="mt-1 list-disc pl-4">
              {getBoilerplateWarnings(zone).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </ZoneCard>
    );
  },
);
