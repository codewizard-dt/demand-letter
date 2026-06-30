import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { injectTemplate, type OutputDocxPreview, type Zone } from '../lib/api';
import { useTemplateOriginalPreview, useTemplateZones } from '../hooks/useJobQueries';
import { usePatchTemplateZones } from '../hooks/useJobMutations';
import { queryKeys } from '../hooks/queryKeys';
import WorkflowStepper from '../components/WorkflowStepper';

type ZoneRow = Zone & { confirmed: boolean };
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ErrorCard from '../components/ErrorCard';
import { ZonePreviewCard } from '../components/ZonePreviewCard';
import { ZoneConfigCard } from '../components/ZoneConfigCard';

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

function isPageCountZone(zone: Zone): boolean {
  return /^page\s+\d+\s+of\s+\d+$/i.test(zone.textContent.trim());
}

function normalizePageCountZone(zone: ZoneRow): ZoneRow {
  if (!isPageCountZone(zone)) return zone;
  return {
    ...zone,
    type: 'variable_populated',
    suggestedFieldName: 'pageCount',
    templateText: zone.templateText ?? 'Page {pageNumber} of {pageCount}',
    confirmed: true,
  };
}

export default function AnnotatePage() {
  useDocumentTitle('Annotate Template — Steno');
  const { id: jobId, templateId } = useParams<{ id: string; templateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [removedZones, setRemovedZones] = useState<Record<string, boolean>>({});
  const [previewMode, setPreviewMode] = useState<'parsed' | 'original'>('parsed');
  const [flashedZoneId, setFlashedZoneId] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [templateTextErrors, setTemplateTextErrors] = useState<Record<string, string | null>>({});
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const sectionsScrollRef = useRef<HTMLDivElement | null>(null);
  const previewZoneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionZoneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const syncingScrollRef = useRef(false);
  const scrollUnlockTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const editFocusTextRef = useRef<string | null>(null);
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
        isPageCountZone(zone)
          ? normalizePageCountZone(zone)
          : zone.textContent.trim().length === 0
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
  const hasFirstPageHeader = zones.some((z) => z.part === 'header' && z.stationaryVariant === 'first');
  const previewZones = zones;
  const isNewLineZone = (zone: ZoneRow) => zone.textContent.trim().length === 0;

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


  function confirmAll() {
    setZones((prev) =>
      prev.map((z) => ({ ...z, confirmed: true })),
    );
  }

  function updateZone(id: string, patch: Partial<ZoneRow>) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
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
    centerZoneInContainer(previewScrollRef.current, previewZoneRefs.current[zoneId] ?? null);
    centerZoneInContainer(sectionsScrollRef.current, sectionZoneRefs.current[zoneId] ?? null);
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
      <WorkflowStepper currentStep={0} {...(jobId ? { jobId } : {})} {...(templateId ? { templateId } : {})} />
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
                {previewZones.map((zone) => (
                  <ZonePreviewCard
                    key={zone.id}
                    ref={(el) => { previewZoneRefs.current[zone.id] = el; }}
                    zone={zone}
                    isRemoved={!!removedZones[zone.id]}
                    onClick={() => centerZonePair(zone.id)}
                    isSubsequentHeader={hasFirstPageHeader && zone.part === 'header' && zone.stationaryVariant === 'default'}
                  />
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
              className="btn-secondary"
            >
              {allConfirmed ? 'All Confirmed' : 'Scroll to Unconfirmed'}
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
              <ZoneConfigCard
                key={zone.id}
                ref={(el) => { sectionZoneRefs.current[zone.id] = el; }}
                zone={zone}
                isRemoved={!!removedZones[zone.id]}
                isFlashing={flashedZoneId === zone.id}
                templateError={templateTextErrors[zone.id] ?? null}
                editFocusRef={editFocusTextRef}
                onUpdateZone={(patch) => updateZone(zone.id, patch)}
                onRemove={() => setRemovedZones(prev => ({ ...prev, [zone.id]: true }))}
                onRestore={() => setRemovedZones(prev => ({ ...prev, [zone.id]: false }))}
                onSetTemplateError={(error) => setTemplateTextErrors(prev => ({ ...prev, [zone.id]: error }))}
                isSubsequentHeader={hasFirstPageHeader && zone.part === 'header' && zone.stationaryVariant === 'default'}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
