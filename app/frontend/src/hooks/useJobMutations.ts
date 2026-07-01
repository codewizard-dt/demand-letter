import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  createJob,
  uploadFile,
  fetchGapReport,
  triggerGenerateJob,
  refineJob,
  exportDocx,
  saveEditorContent,
  downloadExportDocx,
  downloadOutput,
  patchTemplateZones,
  replaceTemplateImage,
  acceptRefinement,
  rejectRefinement,
  deleteJobChange,
  saveValues,
  ingestDocuments,
  segmentTemplate,
  classifyTemplate,
  injectTemplate,
  extractFields,
  type Zone,
  type ChangeRow,
} from '../lib/api';

interface UploadTemplateWorkflowInput {
  templateFile: File;
  onStatus?: (status: string) => void;
}

interface UploadWorkflowInput extends UploadTemplateWorkflowInput {
  caseFiles: File[];
}

interface AddCaseDocumentsInput {
  caseFiles: File[];
  onStatus?: (status: string) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const GAP_REPORT_RECHECK_ATTEMPTS = 60;
const GAP_REPORT_RECHECK_INTERVAL_MS = 3000;

const hasGapReportChanged = (a: { covered: number; total: number; gaps: { fieldName: string }[] }, b: { covered: number; total: number; gaps: { fieldName: string }[] }) => {
  return (
    a.covered !== b.covered ||
    a.total !== b.total ||
    a.gaps.length !== b.gaps.length
  );
};

export function useUploadWorkflow() {
  return useMutation({
    mutationFn: async ({ templateFile, caseFiles, onStatus }: UploadWorkflowInput) => {
      onStatus?.('Creating job…');
      const { id } = await createJob();

      onStatus?.('Uploading template…');
      await uploadFile(id, templateFile);

      for (const [index, pdf] of caseFiles.entries()) {
        onStatus?.(`Uploading case document ${index + 1} of ${caseFiles.length}…`);
        await uploadFile(id, pdf);
      }

      onStatus?.('Ingesting documents…');
      await ingestDocuments(id);

      onStatus?.('Segmenting template…');
      const { templateId } = await segmentTemplate(id);

      onStatus?.('Classifying template zones…');
      await classifyTemplate(id, templateId);

      onStatus?.('Preparing template fields…');
      await injectTemplate(id, templateId);

      onStatus?.('Extracting case facts…');
      await extractFields(id);

      onStatus?.('Opening gap report…');
      return id;
    },
  });
}

export function useUploadTemplateWorkflow() {
  return useMutation({
    mutationFn: async ({ templateFile, onStatus }: UploadTemplateWorkflowInput) => {
      onStatus?.('Creating job…');
      const { id } = await createJob();

      onStatus?.('Uploading template…');
      await uploadFile(id, templateFile);

      onStatus?.('Segmenting template…');
      const { templateId } = await segmentTemplate(id);

      onStatus?.('Classifying template zones…');
      await classifyTemplate(id, templateId);

      onStatus?.('Preparing template fields…');
      await injectTemplate(id, templateId);

      onStatus?.('Opening template review…');
      return { jobId: id, templateId };
    },
  });
}

export function useAddCaseDocuments(jobId: string) {
  const queryClient = useQueryClient();

  const refreshCaseQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.gapReport(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.extractedFields(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.jobFiles(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.jobLogs(jobId) }),
    ]);

  return useMutation({
    mutationFn: async ({ caseFiles, onStatus }: AddCaseDocumentsInput) => {
      for (const [index, pdf] of caseFiles.entries()) {
        onStatus?.(`Uploading case document ${index + 1} of ${caseFiles.length}…`);
        await uploadFile(jobId, pdf);
      }

      onStatus?.('Ingesting documents…');
      const { pending } = await ingestDocuments(jobId);

      onStatus?.('Extracting case facts…');
      await extractFields(jobId);

      await refreshCaseQueries();
      const initialGapReport = await queryClient.fetchQuery({
        queryKey: queryKeys.gapReport(jobId),
        queryFn: () => fetchGapReport(jobId),
      });

      if (pending > 0) {
        let attempts = 0;
        let remainingPending = pending;

        while (attempts < GAP_REPORT_RECHECK_ATTEMPTS) {
          attempts += 1;
          onStatus?.(`Waiting for scanned documents (${attempts}/${GAP_REPORT_RECHECK_ATTEMPTS})…`);
          await sleep(GAP_REPORT_RECHECK_INTERVAL_MS);

          const ingestResult = await ingestDocuments(jobId);
          remainingPending = ingestResult.pending;
          await extractFields(jobId);
          await refreshCaseQueries();

          const latestGapReport = await queryClient.fetchQuery({
            queryKey: queryKeys.gapReport(jobId),
            queryFn: () => fetchGapReport(jobId),
          });

          if (remainingPending === 0 && hasGapReportChanged(initialGapReport, latestGapReport)) {
            break;
          }

          if (remainingPending === 0) {
            break;
          }
        }
      }

      await refreshCaseQueries();
      await queryClient.fetchQuery({
        queryKey: queryKeys.gapReport(jobId),
        queryFn: () => fetchGapReport(jobId),
      });
    },
  });
}

export function useProcessCaseDocuments(jobId: string) {
  const queryClient = useQueryClient();

  const refreshCaseQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.gapReport(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.extractedFields(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.jobFiles(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.jobLogs(jobId) }),
    ]);

  return useMutation({
    mutationFn: async ({ onStatus, force = false }: { onStatus?: (status: string) => void; force?: boolean }) => {
      onStatus?.('Ingesting uploaded case documents…');
      let { pending } = await ingestDocuments(jobId, { force });

      onStatus?.('Extracting case facts…');
      await extractFields(jobId);
      await refreshCaseQueries();

      let attempts = 0;
      while (pending > 0 && attempts < GAP_REPORT_RECHECK_ATTEMPTS) {
        attempts += 1;
        onStatus?.(`Waiting for scanned documents (${attempts}/${GAP_REPORT_RECHECK_ATTEMPTS})…`);
        await sleep(GAP_REPORT_RECHECK_INTERVAL_MS);
        const result = await ingestDocuments(jobId);
        pending = result.pending;
        await extractFields(jobId);
        await refreshCaseQueries();
      }

      await queryClient.fetchQuery({
        queryKey: queryKeys.gapReport(jobId),
        queryFn: () => fetchGapReport(jobId),
      });
    },
  });
}

export function useProcessSingleCaseDocument(jobId: string) {
  const queryClient = useQueryClient();

  const refreshCaseQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.gapReport(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.extractedFields(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.jobFiles(jobId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.jobLogs(jobId) }),
    ]);

  return useMutation({
    mutationFn: async ({ fileId, onStatus }: { fileId: string; onStatus?: (status: string) => void }) => {
      onStatus?.('Reprocessing document…');
      await ingestDocuments(jobId, { fileId });

      onStatus?.('Extracting case facts…');
      await extractFields(jobId);
      await refreshCaseQueries();
    },
  });
}

export function useTriggerGenerateJob() {
  return useMutation({
    mutationFn: (jobId: string) => triggerGenerateJob(jobId),
  });
}

export function useRefineJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      instruction,
      scope,
      onChunk,
    }: {
      instruction: string;
      scope: string | undefined;
      onChunk: (text: string) => void;
    }) => refineJob(jobId, instruction, scope, onChunk),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.refinements(jobId) });
    },
  });
}

export function useAcceptRefinement(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refinementId: string) => acceptRefinement(jobId, refinementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.refinements(jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.outputUrl(jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.docxPreview(jobId) });
    },
  });
}

export function useRejectRefinement(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refinementId: string) => rejectRefinement(jobId, refinementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.refinements(jobId) });
    },
  });
}

export function usePatchTemplateZones(jobId: string, templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Zone[] | { zones: Zone[]; removeZoneIds?: string[] }) => {
      if (Array.isArray(input)) return patchTemplateZones(jobId, templateId, input);
      return patchTemplateZones(jobId, templateId, input.zones, input.removeZoneIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templateZones(jobId, templateId) });
    },
  });
}

export function useReplaceTemplateImage(jobId: string, templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ target, file }: { target: string; file: File }) =>
      replaceTemplateImage(jobId, templateId, target, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templateZones(jobId, templateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.templateOriginalPreview(jobId, templateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.templateSlots(jobId, templateId) });
    },
  });
}

export function useDeleteJobChange(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changeId: string) => deleteJobChange(jobId, changeId),
    onSuccess: (_, changeId) => {
      queryClient.setQueryData<ChangeRow[]>(
        queryKeys.jobChanges(jobId),
        (old) => old?.filter((c) => c.id !== changeId) ?? [],
      );
    },
  });
}

export function useSaveValues(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fields,
      acceptMissing,
    }: {
      fields: { fieldName: string; value: string }[];
      acceptMissing: string[];
    }) => saveValues(jobId, fields, acceptMissing),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gapReport(jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.extractedFields(jobId) });
    },
  });
}

export function useDownloadExportDocx() {
  return useMutation({
    mutationFn: (jobId: string) => downloadExportDocx(jobId),
  });
}

export function useExportDocx() {
  return useMutation({
    mutationFn: ({ jobId, doc }: { jobId: string; doc: unknown }) => exportDocx(jobId, doc),
  });
}

export function useSaveEditorContent() {
  return useMutation({
    mutationFn: ({ jobId, doc }: { jobId: string; doc: unknown }) => saveEditorContent(jobId, doc),
  });
}

export function useDownloadOutput() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const blob = await downloadOutput(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'demand-letter.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
