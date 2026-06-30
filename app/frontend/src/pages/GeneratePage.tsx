import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { connectGenerateStream, fetchJob, getTemplateZones, type OutputDocxPreview } from '../lib/api';
import { useTriggerGenerateJob, useDownloadOutput } from '../hooks/useJobMutations';
import { useLatestTemplate, useDocxPreview } from '../hooks/useJobQueries';
import { queryKeys } from '../hooks/queryKeys';
import LoadingSpinner from '../components/LoadingSpinner';
import { RefinementPanel } from '../components/RefinementPanel';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import WorkflowStepper from '../components/WorkflowStepper';
import ErrorCard from '../components/ErrorCard';
import { ZoneOutputCard } from '../components/ZoneOutputCard';

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

export default function GeneratePage() {
  useDocumentTitle('Generate & Review — Steno');
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [zoneContents, setZoneContents] = useState<Map<number, string>>(new Map());
  const [isDone, setIsDone] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'parsed' | 'docx'>('parsed');
  const abortRef = useRef<AbortController | null>(null);

  const triggerGenerateMutation = useTriggerGenerateJob();
  const downloadMutation = useDownloadOutput();

  const latestTemplateQuery = useLatestTemplate(id);
  const templateId = latestTemplateQuery.data?.templateId;
  const zonesQuery = useQuery({
    queryKey: ['templateZones', id, templateId],
    queryFn: () => getTemplateZones(id!, templateId!),
    enabled: !!id && !!templateId,
    staleTime: Infinity,
  });
  const zones = (zonesQuery.data ?? []).slice().sort((a, b) => a.zoneIndex - b.zoneIndex);

  const docxPreviewQuery = useDocxPreview(id, isDone);
  const docxPreview = docxPreviewQuery.data;
  const preferredHeader = getPreferredStationary(docxPreview?.stationaries, 'header');
  const preferredFooter = getPreferredStationary(docxPreview?.stationaries, 'footer');

  function startStream(jobId: string, ac: AbortController) {
    setStatusMessage('Connecting…');
    connectGenerateStream(
      jobId,
      (event) => {
        if (event.type === 'progress') {
          setStatusMessage(event.message);
        } else if (event.type === 'zone') {
          setZoneContents((prev) => new Map(prev).set(event.zoneIndex, event.content));
        } else if (event.type === 'zone-chunk') {
          setZoneContents((prev) => {
            const m = new Map(prev);
            m.set(event.zoneIndex, (m.get(event.zoneIndex) ?? '') + event.chunk);
            return m;
          });
        } else if (event.type === 'complete') {
          setIsDone(true);
          setStatusMessage(null);
          void queryClient.invalidateQueries({ queryKey: queryKeys.outputUrl(jobId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.docxPreview(jobId) });
        } else if (event.type === 'error') {
          setStreamError(event.message);
          setStatusMessage(null);
        }
      },
      ac.signal,
    ).catch((err) => {
      if (!ac.signal.aborted) {
        setStreamError(String(err));
        setStatusMessage(null);
      }
    });
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const ac = new AbortController();
    abortRef.current = ac;

    fetchJob(id)
      .then((job) => {
        if (cancelled) return;
        if (job.status === 'pending') return;
        if (job.outputS3Key) setIsDone(true);
        startStream(id, ac);
      })
      .catch(() => {
        // job fetch failed — show button, let user trigger manually
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [id]);

  function handleTrigger() {
    if (!id) return;
    triggerGenerateMutation.mutate(id, {
      onSuccess: () => {
        setStreamError(null);
        setZoneContents(new Map());
        setIsDone(false);
        setPreviewMode('parsed');
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        startStream(id, ac);
      },
    });
  }

  function handleDownload() {
    if (id) downloadMutation.mutate(id);
  }

  const showTriggerButton = !statusMessage && !isDone && zoneContents.size === 0 && !triggerGenerateMutation.isPending;
  const isStreaming = !!statusMessage || triggerGenerateMutation.isPending;

  const narrativeZone = zonesQuery.data?.find((z) => z.suggestedFieldName === 'medicalNarrative');
  const narrativeText = narrativeZone ? (zoneContents.get(narrativeZone.zoneIndex) ?? '') : '';

  return (
    <div className="p-8">
      <WorkflowStepper currentStep={3} {...(id ? { jobId: id } : {})} />
      <h1 className="text-2xl font-bold mb-4">Generate & Review</h1>

      {/* Full-width status / trigger bar */}
      {showTriggerButton && (
        <button onClick={handleTrigger} className="btn-primary mb-4">
          Generate Demand Letter
        </button>
      )}
      {triggerGenerateMutation.isPending && (
        <div className="flex items-center gap-3 mb-4">
          <LoadingSpinner className="h-5 w-5 text-primary" />
          <span className="text-primary font-medium">Starting generation…</span>
        </div>
      )}
      {statusMessage && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <LoadingSpinner className="h-4 w-4 text-primary shrink-0" />
          <span className="text-primary text-sm font-medium">{statusMessage}</span>
        </div>
      )}
      {streamError && (
        <div className="mb-4">
          <ErrorCard message={streamError} onRetry={handleTrigger} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">

        {/* Left — document preview */}
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800">Generated Document</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {isDone && (
                <div className="flex rounded-full border border-gray-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('parsed')}
                    className={`px-3 py-1 text-xs rounded-full ${previewMode === 'parsed' ? 'bg-primary text-white' : 'text-gray-700'}`}
                  >
                    Parsed
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('docx')}
                    className={`px-3 py-1 text-xs rounded-full ${previewMode === 'docx' ? 'bg-primary text-white' : 'text-gray-700'}`}
                  >
                    DOCX
                  </button>
                </div>
              )}
              {isDone && (
                <>
                  <button
                    onClick={handleDownload}
                    disabled={downloadMutation.isPending}
                    className="btn-outline text-xs py-1 px-3"
                  >
                    {downloadMutation.isPending ? 'Preparing…' : 'Download DOCX'}
                  </button>
                  <Link
                    to={`/jobs/${id}/editor`}
                    className="text-xs font-medium text-primary border border-primary/30 rounded-full px-3 py-1 hover:bg-primary/5"
                  >
                    Open in Editor →
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="max-h-[72vh] overflow-y-auto rounded border border-gray-200 bg-white p-6 shadow-sm">
            {previewMode === 'docx' && isDone ? (
              <>
                {docxPreviewQuery.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <LoadingSpinner className="h-4 w-4 text-primary" />
                    <span>Loading DOCX preview…</span>
                  </div>
                )}
                {docxPreviewQuery.isError && (
                  <p className="text-sm text-red-600">Failed to load DOCX preview.</p>
                )}
                {docxPreview && (
                  <div className="st-docx-preview-wrap">
                    {preferredHeader && (
                      <div className="st-docx-stationary st-docx-stationary-header">
                        {preferredHeader.imageDataUrl && (
                          <img
                            src={preferredHeader.imageDataUrl}
                            alt="Header"
                            style={getStationaryStyle(preferredHeader.imageWidthPx, preferredHeader.imageHeightPx)}
                            className="st-docx-stationary-image"
                          />
                        )}
                        {preferredHeader.text && (
                          <div className="st-docx-stationary-text">{preferredHeader.text}</div>
                        )}
                      </div>
                    )}
                    <article
                      className="st-template-document st-docx-preview st-original-docx-preview"
                      dangerouslySetInnerHTML={{ __html: docxPreview.html }}
                    />
                    {preferredFooter && (
                      <div className="st-docx-stationary st-docx-stationary-footer">
                        {preferredFooter.imageDataUrl && (
                          <img
                            src={preferredFooter.imageDataUrl}
                            alt="Footer"
                            style={getStationaryStyle(preferredFooter.imageWidthPx, preferredFooter.imageHeightPx)}
                            className="st-docx-stationary-image"
                          />
                        )}
                        {preferredFooter.text && (
                          <div className="st-docx-stationary-text">{preferredFooter.text}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Parsed view — streams zone by zone */
              zones.length === 0 && !isStreaming ? (
                <p className="text-sm text-gray-400">Trigger generation to see a preview.</p>
              ) : (
                <article className="space-y-2 text-sm leading-6 text-gray-900">
                  {zones.map((zone) => {
                    const zoneContent = zoneContents.get(zone.zoneIndex);
                    return (
                      <ZoneOutputCard
                        key={zone.id}
                        zone={zone}
                        {...(zoneContent !== undefined ? { content: zoneContent } : {})}
                      />
                    );
                  })}
                </article>
              )
            )}
          </div>
        </section>

        {/* Right — chat/refinement panel */}
        <aside className="min-w-0">
          <RefinementPanel
            jobId={id!}
            isEnabled={isDone}
            currentText={narrativeText}
            onAccepted={(newText) => {
              if (narrativeZone) {
                setZoneContents((prev) => new Map(prev).set(narrativeZone.zoneIndex, newText));
              }
            }}
          />
        </aside>
      </div>
    </div>
  );
}
