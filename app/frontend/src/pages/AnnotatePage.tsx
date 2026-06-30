import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { injectTemplate, type OutputDocxPreview, type Zone } from '../lib/api';
import { useTemplateOriginalPreview, useTemplateZones } from '../hooks/useJobQueries';
import { usePatchTemplateZones } from '../hooks/useJobMutations';
import { queryKeys } from '../hooks/queryKeys';
import WorkflowStepper from '../components/WorkflowStepper';

type ZoneRow = Zone & { confirmed: boolean };
type ZoneRun = NonNullable<NonNullable<Zone['runPath']>['runs']>[number];
type ZoneImage = NonNullable<NonNullable<Zone['runPath']>['images']>[number];

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ErrorCard from '../components/ErrorCard';

function getPreferredStationary(
  stationaries: OutputDocxPreview['stationaries'] | undefined,
  slot: 'header' | 'footer',
) {
  if (!stationaries) return undefined;
  return stationaries.find((stationary) => stationary.slot === slot && stationary.variant === 'first')
    ?? stationaries.find((stationary) => stationary.slot === slot && stationary.variant === 'default')
    ?? stationaries.find((stationary) => stationary.slot === slot && stationary.variant === 'even');
}

function getStationaryStyle(
  imageWidthPx?: number,
  imageHeightPx?: number,
): CSSProperties | undefined {
  if (!imageWidthPx || !imageHeightPx) return undefined;
  return { width: `${imageWidthPx}px`, height: `${imageHeightPx}px` };
}

export default function AnnotatePage() {
  useDocumentTitle('Annotate Template — Steno');
  const { id: jobId, templateId } = useParams<{ id: string; templateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [saved, setSaved] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [removedZones, setRemovedZones] = useState<Record<string, boolean>>({});
  const [previewMode, setPreviewMode] = useState<'parsed' | 'original'>('parsed');
  const [flashedZoneId, setFlashedZoneId] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const sectionsScrollRef = useRef<HTMLDivElement | null>(null);
  const previewZoneRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const sectionZoneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const syncingScrollRef = useRef(false);
  const scrollUnlockTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const lastNextUnconfirmedZoneIdRef = useRef<string | null>(null);

  const zonesQuery = useTemplateZones(jobId, templateId);
  const originalPreviewQuery = useTemplateOriginalPreview(jobId, templateId, previewMode === 'original');
  const patchMutation = usePatchTemplateZones(jobId!, templateId!);
  const preferredHeader = getPreferredStationary(originalPreviewQuery.data?.stationaries, 'header');
  const preferredFooter = getPreferredStationary(originalPreviewQuery.data?.stationaries, 'footer');
  const originalPreviewBodyStyle: CSSProperties = {};

  useEffect(() => {
    if (zonesQuery.data) {
      setZones((zonesQuery.data as ZoneRow[]).map((zone) => (
        zone.textContent.trim().length === 0
          ? { ...zone, type: 'boilerplate_verbatim', suggestedFieldName: null, confirmed: true }
          : zone
      )));
      setRemovedZones({});
    }
  }, [zonesQuery.data]);

  const loading = zonesQuery.isLoading;
  const error = zonesQuery.error
    ? String(zonesQuery.error)
    : patchMutation.error
      ? String(patchMutation.error)
      : saveError;
  const submitting = patchMutation.isPending || savingTemplate;
  const activeZones = zones.filter((z) => !removedZones[z.id]);
  const boilerplateCount = activeZones.filter((z) => z.type === 'boilerplate_verbatim').length;
  const variableCount = activeZones.filter((z) => z.type === 'variable_populated').length;
  const unclassifiedCount = activeZones.filter((z) => z.type === null).length;
  const confirmedCount = activeZones.filter((z) => z.confirmed).length;
  const allConfirmed = activeZones.length > 0 && confirmedCount === activeZones.length;
  const getZoneText = (zone: ZoneRow) => zone.textContent.trim() || 'New line';
  const isNewLineZone = (zone: ZoneRow) => zone.textContent.trim().length === 0;
  const getBoilerplateWarnings = (zone: ZoneRow) => {
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
  };
  const normalizeZonesForSave = () =>
    zones.map((zone) => (
      isNewLineZone(zone)
        ? { ...zone, type: 'boilerplate_verbatim' as const, suggestedFieldName: null, confirmed: true }
        : zone
    ));
  const refreshInjectedTemplateQueries = async () => {
    if (!jobId || !templateId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.templateSlots(jobId, templateId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.latestTemplate(jobId) }),
    ]);
  };
  const getZonePreviewStyle = (zone: ZoneRow): CSSProperties => ({
    textAlign: zone.runPath?.paragraph?.alignment === 'both'
      ? 'justify'
      : zone.runPath?.paragraph?.alignment,
  });
  const getRunStyle = (run: ZoneRun): CSSProperties => ({
    fontWeight: run.bold ? 700 : undefined,
    fontStyle: run.italic ? 'italic' : undefined,
    textDecoration: run.underline ? 'underline' : undefined,
    fontFamily: run.font,
    fontSize: run.fontSize ? `${run.fontSize}pt` : undefined,
  });
  const renderZoneImages = (images: ZoneImage[] | undefined) => {
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
  };
  const getZoneImages = (zone: ZoneRow): ZoneImage[] => {
    const images = [
      ...(zone.runPath?.images ?? []),
      ...(zone.runPath?.runs?.flatMap((run) => run.images ?? []) ?? []),
    ];
    return images.filter((image, index, all) => (
      all.findIndex((candidate) => candidate.relId === image.relId && candidate.target === image.target) === index
    ));
  };
  const isImagePlaceholderText = (zone: ZoneRow) =>
    getZoneImages(zone).length > 0 && /^(header|document|footer) image$/i.test(zone.textContent.trim());
  const renderZoneContent = (zone: ZoneRow) => {
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
  };

  function confirmAll() {
    setZones((prev) =>
      prev.map((z) => ({ ...z, confirmed: true })),
    );
  }

  function updateZone(id: string, patch: Partial<ZoneRow>) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  function updateZoneText(zone: ZoneRow, textContent: string) {
    const runs = zone.runPath?.runs;
    const nextRunPath = zone.runPath && runs && runs.length > 0
      ? {
        ...zone.runPath,
        runs: runs.map((run, index) => ({
          ...run,
          text: index === 0 ? textContent : '',
        })),
      }
      : zone.runPath;
    updateZone(zone.id, { textContent, runPath: nextRunPath, confirmed: false });
  }

  async function handleSubmit() {
    if (!jobId || !templateId || submitting) return;
    setSavingTemplate(true);
    setSaveError(null);
    try {
      await patchMutation.mutateAsync(normalizeZonesForSave());
      await injectTemplate(jobId, templateId, { confirmed: true });
      await refreshInjectedTemplateQueries();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleContinue() {
    if (!jobId || !templateId || !allConfirmed || submitting) return;
    const removeZoneIds = Object.entries(removedZones)
      .filter(([, remove]) => remove)
      .map(([zoneId]) => zoneId);
    setSavingTemplate(true);
    setSaveError(null);
    try {
      await patchMutation.mutateAsync({
        zones: normalizeZonesForSave().filter((zone) => !removedZones[zone.id]),
        removeZoneIds,
      });
      await injectTemplate(jobId, templateId, { confirmed: true });
      await refreshInjectedTemplateQueries();
      navigate(`/jobs/${jobId}/documents`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTemplate(false);
    }
  }

  function getTopZoneId(
    container: HTMLDivElement,
    refs: Record<string, HTMLElement | null>,
  ): string | null {
    const scrollTop = container.scrollTop + 8;
    for (const zone of zones) {
      const el = refs[zone.id];
      if (!el) continue;
      const top = el.offsetTop - container.offsetTop;
      const bottom = top + el.offsetHeight;
      if (bottom > scrollTop) {
        return zone.id;
      }
    }
    return zones[zones.length - 1]?.id ?? null;
  }

  function syncScroll(
    source: HTMLDivElement | null,
    sourceRefs: Record<string, HTMLElement | null>,
    target: HTMLDivElement | null,
    targetRefs: Record<string, HTMLElement | null>,
  ) {
    if (!source || !target || syncingScrollRef.current) return;
    const zoneId = getTopZoneId(source, sourceRefs);
    const targetEl = zoneId ? targetRefs[zoneId] : null;
    if (!targetEl) return;
    syncingScrollRef.current = true;
    const targetTop = targetEl.offsetTop - target.offsetTop;
    target.scrollTo({ top: Math.max(targetTop - 8, 0), behavior: 'auto' });
    scheduleScrollUnlock(80);
  }

  function scheduleScrollUnlock(delayMs = 140) {
    if (scrollUnlockTimerRef.current !== null) {
      window.clearTimeout(scrollUnlockTimerRef.current);
    }
    scrollUnlockTimerRef.current = window.setTimeout(() => {
      syncingScrollRef.current = false;
      scrollUnlockTimerRef.current = null;
    }, delayMs);
  }

  function handleSyncedScroll(
    source: HTMLDivElement | null,
    sourceRefs: Record<string, HTMLElement | null>,
    target: HTMLDivElement | null,
    targetRefs: Record<string, HTMLElement | null>,
  ) {
    if (syncingScrollRef.current) {
      scheduleScrollUnlock();
      return;
    }
    syncScroll(source, sourceRefs, target, targetRefs);
  }

  function centerZoneInContainer(container: HTMLDivElement | null, targetEl: HTMLElement | null) {
    if (!container || !targetEl) return;
    const targetTop = targetEl.offsetTop - container.offsetTop;
    const centeredTop = targetTop - (container.clientHeight - targetEl.offsetHeight) / 2;
    container.scrollTo({ top: Math.max(centeredTop, 0), behavior: 'smooth' });
  }

  function centerZonePair(zoneId: string) {
    syncingScrollRef.current = true;
    centerZoneInContainer(previewScrollRef.current, previewZoneRefs.current[zoneId]);
    centerZoneInContainer(sectionsScrollRef.current, sectionZoneRefs.current[zoneId]);
    scheduleScrollUnlock(500);
  }

  function goToNextUnconfirmedZone() {
    const currentZoneId = sectionsScrollRef.current
      ? getTopZoneId(sectionsScrollRef.current, sectionZoneRefs.current)
      : null;
    const currentIndex = currentZoneId ? zones.findIndex((zone) => zone.id === currentZoneId) : -1;
    const lastIndex = lastNextUnconfirmedZoneIdRef.current
      ? zones.findIndex((zone) => zone.id === lastNextUnconfirmedZoneIdRef.current)
      : -1;
    const lastZone = lastIndex >= 0 ? zones[lastIndex] : null;
    const startIndex = lastZone && !removedZones[lastZone.id] && !lastZone.confirmed
      ? lastIndex
      : currentIndex - 1;
    const nextZone = zones.find((zone, index) => (
      index > startIndex && !removedZones[zone.id] && !zone.confirmed
    )) ?? zones.find((zone) => !removedZones[zone.id] && !zone.confirmed);
    if (nextZone) {
      lastNextUnconfirmedZoneIdRef.current = nextZone.id;
      centerZonePair(nextZone.id);
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
      window.setTimeout(() => {
        setFlashedZoneId(nextZone.id);
        flashTimerRef.current = window.setTimeout(() => {
          setFlashedZoneId(null);
          flashTimerRef.current = null;
        }, 900);
      }, 520);
    }
  }

  if (loading) return <div className="p-8">Loading zones…</div>;
  if (error) return <ErrorCard message={`Error: ${error}`} />;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <WorkflowStepper currentStep={0} jobId={jobId} templateId={templateId} />
      <h1 className="text-2xl font-bold mb-3">Review Template Parsing</h1>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Sections</p>
          <p className="text-xl font-semibold">{activeZones.length}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Boilerplate</p>
          <p className="text-xl font-semibold">{boilerplateCount}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Variables</p>
          <p className="text-xl font-semibold">{variableCount}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Unclassified</p>
          <p className="text-xl font-semibold">{unclassifiedCount}</p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          onClick={confirmAll}
          className="btn-primary"
        >
          Confirm All Sections
        </button>
        <button
          onClick={handleContinue}
          disabled={submitting || !allConfirmed}
          className="btn-primary"
          title={!allConfirmed ? 'Confirm every recognized section before continuing.' : undefined}
        >
          {submitting ? 'Saving…' : 'Continue to Case Documents'}
        </button>
      </div>
      {!allConfirmed && (
        <p className="mb-4 text-sm text-yellow-700">
          Confirm each recognized section before continuing. {confirmedCount} of {activeZones.length} sections confirmed.
        </p>
      )}
      {saved && (
        <div className="mb-4 st-status-banner st-status-banner-success" role="status" aria-live="polite">
          Zones saved successfully.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {previewMode === 'parsed' ? 'Parsed Template Preview' : 'Original Document'}
            </h2>
            <div className="flex rounded-full border border-gray-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('parsed')}
                className={`px-3 py-1 text-sm rounded-full ${previewMode === 'parsed' ? 'bg-primary text-white' : 'text-gray-700'}`}
              >
                Parsed
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('original')}
                className={`px-3 py-1 text-sm rounded-full ${previewMode === 'original' ? 'bg-primary text-white' : 'text-gray-700'}`}
              >
                Original
              </button>
            </div>
          </div>
          <div
            ref={previewScrollRef}
            onScroll={previewMode === 'parsed'
              ? () => handleSyncedScroll(
                previewScrollRef.current,
                previewZoneRefs.current,
                sectionsScrollRef.current,
                sectionZoneRefs.current,
              )
              : undefined}
            className="max-h-[72vh] overflow-y-auto rounded border border-gray-200 bg-white p-6 shadow-sm"
          >
            {previewMode === 'original' ? (
              <>
                {originalPreviewQuery.isLoading && <p className="text-sm text-gray-500">Loading original document…</p>}
                {originalPreviewQuery.isError && (
                  <p className="text-sm text-red-700">Original document failed to render.</p>
                )}
                {originalPreviewQuery.data && (
                  <div className="st-docx-preview-wrap">
                    {preferredHeader && (
                      <div className="st-docx-stationary st-docx-stationary-header">
                        {preferredHeader.imageDataUrl && (
                          <img
                            src={preferredHeader.imageDataUrl}
                            alt="Template header"
                            style={getStationaryStyle(preferredHeader.imageWidthPx, preferredHeader.imageHeightPx)}
                            className="st-docx-stationary-image"
                          />
                        )}
                        {preferredHeader.text ? (
                          <div className="st-docx-stationary-text">{preferredHeader.text}</div>
                        ) : null}
                      </div>
                    )}
                    <article
                      className="st-template-document st-docx-preview st-original-docx-preview"
                      style={originalPreviewBodyStyle}
                      dangerouslySetInnerHTML={{ __html: originalPreviewQuery.data.html }}
                    />
                    {preferredFooter && (
                      <div className="st-docx-stationary st-docx-stationary-footer">
                        {preferredFooter.imageDataUrl && (
                          <img
                            src={preferredFooter.imageDataUrl}
                            alt="Template footer"
                            style={getStationaryStyle(preferredFooter.imageWidthPx, preferredFooter.imageHeightPx)}
                            className="st-docx-stationary-image"
                          />
                        )}
                        {preferredFooter.text ? (
                          <div className="st-docx-stationary-text">{preferredFooter.text}</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <article className="space-y-3 text-sm leading-6 text-gray-900">
                {zones.map((zone) => (
                  <p
                    key={zone.id}
                    ref={(el) => { previewZoneRefs.current[zone.id] = el; }}
                    onClick={() => centerZonePair(zone.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        centerZonePair(zone.id);
                      }
                    }}
                    className={`cursor-pointer rounded border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${removedZones[zone.id]
                        ? 'border-red-200 bg-red-50 text-red-700 line-through'
                        : zone.type === 'variable_populated'
                          ? 'border-blue-300 bg-blue-50'
                          : zone.type === 'boilerplate_verbatim'
                            ? 'border-amber-200 bg-amber-50/50'
                            : 'border-gray-200 bg-gray-50'
                      }`}
                    style={getZonePreviewStyle(zone)}
                  >
                    <span className="mb-1 block text-xs font-medium text-gray-500">
                      Zone {zone.zoneIndex}
                    </span>
                    {renderZoneContent(zone)}
                  </p>
                ))}
              </article>
            )}
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recognized Sections</h2>
            <button
              type="button"
              onClick={goToNextUnconfirmedZone}
              disabled={allConfirmed}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-primary disabled:cursor-not-allowed disabled:text-gray-400"
            >
              Next Unconfirmed
            </button>
          </div>
          <div
            ref={sectionsScrollRef}
            onScroll={() => handleSyncedScroll(
              sectionsScrollRef.current,
              sectionZoneRefs.current,
              previewScrollRef.current,
              previewZoneRefs.current,
            )}
            className="max-h-[72vh] space-y-3 overflow-y-auto py-0.5 pl-1 pr-1"
          >
            {zones.map((zone) => (
              <div
                key={zone.id}
                ref={(el) => { sectionZoneRefs.current[zone.id] = el; }}
                className={`border rounded p-4 transition-[border-color,box-shadow,background-color] duration-200 ${removedZones[zone.id]
                    ? 'border-red-300 bg-red-50'
                    : flashedZoneId === zone.id
                      ? 'border-primary bg-white ring-2 ring-primary/40'
                      : zone.confirmed
                        ? 'border-teal-400 bg-teal-50'
                        : 'border-gray-200'
                  }`}
              >
                <p className="text-sm text-gray-500 mb-1">Zone {zone.zoneIndex}</p>
                {(zone.part === 'header' || zone.part === 'footer') && (
                  <span className="inline-block mb-1 px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                    {zone.part === 'header' ? 'Header' : 'Footer'}
                    {zone.stationaryVariant && zone.stationaryVariant !== 'default'
                      ? ` (${zone.stationaryVariant} page)`
                      : ' (all pages)'}
                  </span>
                )}
                <div className="mb-3">
                  {getZoneImages(zone).length > 0 && (
                    <div className="mb-3 rounded border border-gray-200 bg-white p-2">
                      {renderZoneImages(getZoneImages(zone))}
                    </div>
                  )}
                  {zone.type === 'boilerplate_verbatim' && !isNewLineZone(zone) && !isImagePlaceholderText(zone) ? (
                    <textarea
                      value={zone.textContent}
                      onChange={(e) => updateZoneText(zone, e.target.value)}
                      rows={expandedZones[zone.id] ? 6 : 3}
                      className="min-h-20 w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm leading-5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      aria-label={`Zone ${zone.zoneIndex} boilerplate text`}
                    />
                  ) : (
                    <p className={`font-mono text-sm ${expandedZones[zone.id] ? '' : 'line-clamp-2'}`}>
                      {getZoneText(zone)}
                    </p>
                  )}
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
                  {zone.textContent.length > 80 && zone.type !== 'boilerplate_verbatim' && (
                    <button
                      type="button"
                      onClick={() => setExpandedZones(prev => ({ ...prev, [zone.id]: !prev[zone.id] }))}
                      className="text-xs text-primary-gold hover:underline mt-0.5"
                    >
                      {expandedZones[zone.id] ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {removedZones[zone.id] ? (
                    <button
                      type="button"
                      onClick={() => setRemovedZones(prev => ({ ...prev, [zone.id]: false }))}
                      className="px-3 py-1 text-sm rounded border ml-auto bg-red-100 border-red-400 text-red-700"
                    >
                      Keep
                    </button>
                  ) : isNewLineZone(zone) ? (
                    <>
                      <span className="px-3 py-1 text-sm rounded border bg-amber-100 border-amber-400">
                        Boilerplate
                      </span>
                      <button
                        type="button"
                        onClick={() => setRemovedZones(prev => ({ ...prev, [zone.id]: true }))}
                        className="px-3 py-1 text-sm rounded border ml-auto border-gray-300"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => updateZone(zone.id, { type: 'boilerplate_verbatim', confirmed: false })}
                        className={`px-3 py-1 text-sm rounded border ${zone.type === 'boilerplate_verbatim' ? 'bg-amber-100 border-amber-400' : 'border-gray-300'}`}
                      >
                        Boilerplate
                      </button>
                      <button
                        onClick={() => updateZone(zone.id, { type: 'variable_populated', confirmed: false })}
                        className={`px-3 py-1 text-sm rounded border ${zone.type === 'variable_populated' ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}
                      >
                        Variable
                      </button>
                      {zone.type === 'variable_populated' && (
                        <input
                          type="text"
                          value={zone.suggestedFieldName ?? ''}
                          onChange={(e) => updateZone(zone.id, { suggestedFieldName: e.target.value })}
                          placeholder="field_name"
                          className="border rounded px-2 py-1 text-sm flex-1 min-w-32"
                        />
                      )}
                      <button
                        onClick={() => updateZone(zone.id, { confirmed: !zone.confirmed })}
                        className={`px-3 py-1 text-sm rounded border ${zone.confirmed ? 'bg-teal-100 border-teal-400' : 'border-gray-300'}`}
                      >
                        {zone.confirmed ? 'Confirmed ✓' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemovedZones(prev => ({ ...prev, [zone.id]: true }))}
                        className="px-3 py-1 text-sm rounded border ml-auto border-gray-300"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
