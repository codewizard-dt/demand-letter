import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  createJob,
  uploadFile,
  fetchGapReport,
  generateJob,
  triggerGenerateJob,
  refineJob,
  exportDocx,
  downloadExportDocx,
  downloadOutput,
  patchTemplateZones,
  acceptRefinement,
  rejectRefinement,
  deleteJobChange,
  submitAttorneyJudgment,
  ingestDocuments,
  segmentTemplate,
  classifyTemplate,
  injectTemplate,
  extractFields,
  type Zone,
  type ChangeRow,
} from '../lib/api';

interface UploadWorkflowInput {
  templateFile: File;
  caseFiles: File[];
  onStatus?: (status: string) => void;
}

interface AddCaseDocumentsInput {
  caseFiles: File[];
  onStatus?: (status: string) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const GAP_REPORT_RECHECK_ATTEMPTS = 10;
const GAP_REPORT_RECHECK_INTERVAL_MS = 3000;

const hasGapReportChanged = (a: { covered: number; total: number; gaps: Array<{ fieldName: string }> }, b: { covered: number; total: number; gaps: Array<{ fieldName: string }> }) => {
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

          if (hasGapReportChanged(initialGapReport, latestGapReport)) {
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

export function useGenerateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, onChunk }: { jobId: string; onChunk: (text: string) => void }) =>
      generateJob(jobId, onChunk),
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outputUrl(jobId) });
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
    mutationFn: (zones: Zone[]) => patchTemplateZones(jobId, templateId, zones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templateZones(jobId, templateId) });
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

export function useSubmitAttorneyJudgment(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fields,
      acceptMissing,
    }: {
      fields: Array<{ fieldName: string; value: string }>;
      acceptMissing: string[];
    }) => submitAttorneyJudgment(jobId, fields, acceptMissing),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gapReport(jobId) });
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
