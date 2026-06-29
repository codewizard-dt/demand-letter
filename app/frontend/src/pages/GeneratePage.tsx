import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useGapReport, useOutputUrl, useDocxHtml, useDocxPreview } from '../hooks/useJobQueries';
import { useGenerateJob, useDownloadOutput } from '../hooks/useJobMutations';
import LoadingSpinner from '../components/LoadingSpinner';
import type { OutputDocxPreview } from '../lib/api';

import { RefinementPanel } from '../components/RefinementPanel';
import { RefinementHistory } from '../components/RefinementHistory';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

import WorkflowStepper from '../components/WorkflowStepper';
import ErrorCard from '../components/ErrorCard';

function formatGeneratedDocument(text: string): JSX.Element[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: JSX.Element[] = [];
  let currentParagraph: string[] = [];
  let currentList: string[] = [];
  let listType: 'unordered' | 'ordered' | null = null;
  let orderedStart = 1;

  const flushParagraph = () => {
    if (currentParagraph.length === 0) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="st-letter-paragraph">
        {currentParagraph.map((line, index) => (
          <span key={`${blocks.length}-p-line-${index}`}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </p>,
    );
    currentParagraph = [];
  };

  const flushList = () => {
    if (currentList.length === 0) return;
    const start = orderedStart;
    const ListTag = listType === 'ordered' ? 'ol' : 'ul';
    const items = currentList.map((item, i) => (
      <li key={`list-item-${blocks.length}-${i}`}>{item}</li>
    ));
    blocks.push(
      <ListTag key={`list-${blocks.length}`} className="st-letter-list" start={listType === 'ordered' ? start : undefined}>
        {items}
      </ListTag>,
    );
    currentList = [];
    listType = null;
    orderedStart = 1;
  };

  const isSectionHeading = (line: string) => {
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 96) return false;
    if (trimmed !== trimmed.toUpperCase()) return false;
    if (!/[A-Z]/.test(trimmed)) return false;
    if (/^\d/.test(trimmed)) return false;
    return true;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType === 'ordered') {
        flushList();
      }
      listType = 'unordered';
      currentList.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)[\.)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType === 'unordered') {
        flushList();
      }
      const start = Number.parseInt(orderedMatch[1], 10);
      if (listType !== 'ordered') {
        orderedStart = Number.isNaN(start) ? 1 : start;
      }
      listType = 'ordered';
      currentList.push(orderedMatch[2]);
      continue;
    }

    if (isSectionHeading(trimmed) && currentParagraph.length === 0 && currentList.length === 0) {
      flushParagraph();
      flushList();
      blocks.push(<h3 key={`h-${blocks.length}`}>{trimmed}</h3>);
      continue;
    }

    if (currentList.length > 0) {
      flushList();
    }
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

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
  if (!imageWidthPx || !imageHeightPx) {
    return undefined;
  }
  return { width: `${imageWidthPx}px`, height: `${imageHeightPx}px` };
}

function getStationaryPadding(imageHeightPx?: number, fallback = 0): string | undefined {
  if (!imageHeightPx) return fallback > 0 ? `${fallback}px` : undefined;
  return `${imageHeightPx + 12}px`;
}

export default function GeneratePage() {
  useDocumentTitle('Generate — Steno');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const outputStorageKey = id ? `generated-output:${id}` : null;
  const [output, setOutput] = useState(() => {
    if (!outputStorageKey) return '';
    try {
      return sessionStorage.getItem(outputStorageKey) ?? '';
    } catch {
      return '';
    }
  });
  const [isDone, setIsDone] = useState(false);

  const gapReportQuery = useGapReport(id);
  const generateMutation = useGenerateJob();
  const downloadMutation = useDownloadOutput();
  const outputUrlQuery = useOutputUrl(id);
  const docxHtmlQuery = useDocxHtml(id, outputUrlQuery.data);
  const docxPreviewQuery = useDocxPreview(id, outputUrlQuery.isSuccess);

  const preferredHeader = getPreferredStationary(docxPreviewQuery.data?.stationaries, 'header');
  const preferredFooter = getPreferredStationary(docxPreviewQuery.data?.stationaries, 'footer');

  useEffect(() => {
    if (!id) return;
    queryClient.setQueryData(['generatedOutput', id], output);
    if (!outputStorageKey) return;
    try {
      if (output.length > 0) {
        sessionStorage.setItem(outputStorageKey, output);
      } else {
        sessionStorage.removeItem(outputStorageKey);
      }
    } catch {
      // Storage can fail in private mode or restricted contexts; keep in-memory cache only.
    }
  }, [id, output, outputStorageKey, queryClient]);

  function handleGenerate() {
    setOutput('');
    setIsDone(false);
    if (outputStorageKey) {
      try {
        sessionStorage.removeItem(outputStorageKey);
      } catch {}
    }
    if (id) {
      queryClient.setQueryData(['generatedOutput', id], '');
    }
    generateMutation.mutate(
      { jobId: id!, onChunk: (chunk) => setOutput((prev) => prev + chunk) },
      { onSuccess: () => setIsDone(true) },
    );
  }

  function handleDownload() {
    downloadMutation.mutate(id!);
  }

  const canGenerate =
    !gapReportQuery.isLoading &&
    !gapReportQuery.isError &&
    gapReportQuery.data !== undefined &&
    gapReportQuery.data.gaps.length === 0;

  const disabledReason = gapReportQuery.isLoading
    ? 'Checking sufficiency — please wait…'
    : gapReportQuery.isError
      ? `Could not check gap report: ${String(gapReportQuery.error)}`
      : gapReportQuery.data && gapReportQuery.data.gaps.length > 0
        ? `${gapReportQuery.data.gaps.length} required slot${gapReportQuery.data.gaps.length === 1 ? '' : 's'} still uncovered. Go to the Gap Report to fill or accept them before generating.`
        : null;

  const isGenerating = generateMutation.isPending;
  const isDownloading = downloadMutation.isPending;
  const error = generateMutation.error ? String(generateMutation.error) : null;
  const renderedOutput = useMemo(() => formatGeneratedDocument(output), [output]);
  const hasGeneratedOutput = output.length > 0 || outputUrlQuery.isSuccess || !!docxPreviewQuery.data || !!docxHtmlQuery.data;
  const hasOutputHtml = !!docxPreviewQuery.data?.html || !!docxHtmlQuery.data;
  const isPreviewReady = !!docxPreviewQuery.data?.html;
  const previewHtml = docxPreviewQuery.data?.html ?? docxHtmlQuery.data;
  const previewBodyStyle: CSSProperties = {};
  if (preferredHeader?.imageHeightPx) {
    previewBodyStyle.paddingTop = getStationaryPadding(preferredHeader.imageHeightPx, 32);
  } else if (preferredHeader?.text) {
    previewBodyStyle.paddingTop = '1.25rem';
  }
  if (preferredFooter?.imageHeightPx) {
    previewBodyStyle.paddingBottom = getStationaryPadding(preferredFooter.imageHeightPx, 24);
  } else if (preferredFooter?.text) {
    previewBodyStyle.paddingBottom = '1.25rem';
  }
  const showLoadingPreview = isDone
    && (outputUrlQuery.isLoading
      || (outputUrlQuery.isSuccess && docxPreviewQuery.isLoading && !isPreviewReady)
      || (!docxHtmlQuery.data && docxHtmlQuery.isLoading));
  const showOutput = isDone || hasGeneratedOutput;
  const canFallbackPreview = !isPreviewReady && !!docxHtmlQuery.data;
  const canRefine = isDone || output.length > 0;
  const canDownload = hasGeneratedOutput;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <WorkflowStepper currentStep={3} jobId={id} />
      <h1 className="text-2xl font-bold mb-6">Generate Demand Letter</h1>

      {!isDone && (
        <div>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            title={disabledReason ?? undefined}
            className="btn-primary"
          >
            Generate Demand Letter
          </button>
          {disabledReason && !isGenerating && (
            <p className="mt-2 text-sm text-yellow-700">{disabledReason}</p>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-3 mt-4">
          <LoadingSpinner className="h-5 w-5 text-primary" />
          <span className="text-primary font-medium">Building document…</span>
        </div>
      )}

      {error && <ErrorCard message={error} onRetry={handleGenerate} />}

      {showOutput && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="false"
          className="mt-6 st-template-document-wrap"
        >
          {showLoadingPreview && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <LoadingSpinner className="h-4 w-4 text-primary" />
              <span>Rendering template preview…</span>
            </div>
          )}
          {(docxPreviewQuery.isError || docxHtmlQuery.isError) && !hasOutputHtml && (
            <p className="mb-3 text-sm text-red-700">
              Template preview failed to render from DOCX. Download to verify the output directly.
            </p>
          )}
          {canFallbackPreview && docxHtmlQuery.data ? (
            <article
              className="st-template-document st-docx-preview"
              dangerouslySetInnerHTML={{ __html: docxHtmlQuery.data }}
            />
          ) : (
            hasOutputHtml ? (
              <div className="st-docx-preview-wrap">
                {preferredHeader && (
                  <div className="st-docx-stationary st-docx-stationary-header">
                    {preferredHeader?.imageDataUrl && (
                      <img
                        src={preferredHeader.imageDataUrl}
                        alt="Header stationary"
                        style={getStationaryStyle(preferredHeader.imageWidthPx, preferredHeader.imageHeightPx)}
                        className="st-docx-stationary-image"
                      />
                    )}
                    {preferredHeader?.text ? (
                      <div className="st-docx-stationary-text">{preferredHeader.text}</div>
                    ) : null}
                  </div>
                )}
                <article
                  className="st-template-document st-docx-preview"
                  style={previewBodyStyle}
                  dangerouslySetInnerHTML={{ __html: previewHtml! }}
                />
                {preferredFooter && (
                  <div className="st-docx-stationary st-docx-stationary-footer">
                    {preferredFooter?.imageDataUrl && (
                      <img
                        src={preferredFooter.imageDataUrl}
                        alt="Footer stationary"
                        style={getStationaryStyle(preferredFooter.imageWidthPx, preferredFooter.imageHeightPx)}
                        className="st-docx-stationary-image"
                      />
                    )}
                    {preferredFooter?.text ? (
                      <div className="st-docx-stationary-text">{preferredFooter.text}</div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <article className="st-template-document">
                {renderedOutput}
                {!output && outputUrlQuery.isSuccess && (
                  <p className="text-sm text-gray-600">Generated document is available and will be previewed in DOCX form once ready.</p>
                )}
              </article>
            )
          )}
        </div>
      )}

      {canRefine && (
        <RefinementPanel
          jobId={id!}
          currentText={output}
          onAccepted={(newText) => setOutput(newText)}
        />
      )}

      {canRefine && (
        <RefinementHistory jobId={id!} />
      )}

      {canDownload && (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => navigate(`/jobs/${id}/editor`)}
            className="btn-primary"
          >
            Open in Editor
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-outline"
          >
            {isDownloading ? 'Preparing…' : 'Download DOCX'}
          </button>
        </div>
      )}
    </div>
  );
}
