import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  createJob,
  uploadFile,
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

export function useUploadWorkflow() {
  return useMutation({
    mutationFn: async ({ templateFile, caseFiles }: { templateFile: File; caseFiles: File[] }) => {
      const { id } = await createJob();
      await uploadFile(id, templateFile);
      for (const pdf of caseFiles) {
        await uploadFile(id, pdf);
      }
      await ingestDocuments(id);
      const { templateId } = await segmentTemplate(id);
      await classifyTemplate(id, templateId);
      await injectTemplate(id, templateId);
      await extractFields(id);
      return id;
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
      const url = await downloadOutput(jobId);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'demand-letter.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  });
}
