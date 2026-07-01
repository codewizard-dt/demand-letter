import { useQuery } from '@tanstack/react-query';
import mammoth from 'mammoth';
import { queryKeys } from './queryKeys';
import {
  fetchLlmCosts,
  fetchGapReport,
  fetchOutputUrl,
  fetchOutputDocxPreview,
  fetchExtractedFields,
  fetchBlocks,
  fetchJobChanges,
  fetchRefinements,
  fetchJobs,
  getTemplateZones,
  fetchTemplateSlots,
  fetchJobFiles,
  fetchJobLogs,
  fetchOutputDocx,
  fetchOutputDocxByUrl,
  fetchTemplateOriginalPreview,
  fetchLatestTemplate,
  fetchJob,
  fetchOutputImages,
} from '../lib/api';

export function useLlmCosts(days = 30) {
  return useQuery({
    queryKey: queryKeys.llmCosts(days),
    queryFn: () => fetchLlmCosts(days),
  });
}

export function useOutputImages(jobId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.outputImages(jobId!),
    queryFn: () => fetchOutputImages(jobId!),
    enabled: !!jobId && enabled,
    staleTime: 0,
  });
}

export function useGapReport(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.gapReport(jobId!),
    queryFn: () => fetchGapReport(jobId!),
    enabled: !!jobId,
    retry: false,
  });
}

export function useOutputUrl(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.outputUrl(jobId!),
    queryFn: () => fetchOutputUrl(jobId!),
    enabled: !!jobId,
    staleTime: 4 * 60_000,
  });
}

export function useDocxHtml(jobId: string | undefined, url: string | undefined) {
  return useQuery({
    queryKey: queryKeys.docxHtml(jobId!, url),
    queryFn: async () => {
      const buf = await (async () => {
        if (url) {
          try {
            return await fetchOutputDocxByUrl(url);
          } catch {
            return await fetchOutputDocx(jobId!);
          }
        }
        return await fetchOutputDocx(jobId!);
      })();
      const { value } = await mammoth.convertToHtml(
        { arrayBuffer: buf },
        {
          ignoreEmptyParagraphs: false,
          styleMap: [
            "p[style-name='Boilerplate'] => p.boilerplate-zone:fresh",
            "r[style-name='Boilerplate'] => span.boilerplate-zone",
            "p[style-name='Normal'] => p.docx-paragraph:fresh",
            "p[style-name='List Paragraph'] => p.docx-list-paragraph:fresh",
            "p[style-name='Title'] => h1.docx-title:fresh",
            "p[style-name='Heading 1'] => h1.docx-heading-1:fresh",
            "p[style-name='Heading 2'] => h2.docx-heading-2:fresh",
            "p[style-name='Heading 3'] => h3.docx-heading-3:fresh",
          ],
        },
      );
      return value;
    },
    enabled: !!url,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useDocxPreview(jobId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.docxPreview(jobId!),
    queryFn: () => fetchOutputDocxPreview(jobId!),
    enabled: !!jobId && enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useExtractedFields(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.extractedFields(jobId!),
    queryFn: () => fetchExtractedFields(jobId!),
    enabled: !!jobId,
  });
}

export function useBlocks(jobId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: queryKeys.blocks(jobId!, limit),
    queryFn: () => fetchBlocks(jobId!, limit),
    enabled: !!jobId,
  });
}

export function useJobChanges(jobId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.jobChanges(jobId!),
    queryFn: () => fetchJobChanges(jobId!),
    enabled: !!jobId && enabled,
    staleTime: 0,
  });
}

export function useRefinements(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.refinements(jobId!),
    queryFn: () => fetchRefinements(jobId!),
    enabled: !!jobId,
  });
}

export function useTemplateZones(jobId: string | undefined, templateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.templateZones(jobId!, templateId!),
    queryFn: () => getTemplateZones(jobId!, templateId!),
    enabled: !!jobId && !!templateId,
  });
}

export function useTemplateSlots(jobId: string | undefined, templateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.templateSlots(jobId!, templateId!),
    queryFn: () => fetchTemplateSlots(jobId!, templateId!),
    enabled: !!jobId && !!templateId,
    staleTime: 5 * 60_000,
  });
}

export function useTemplateOriginalPreview(jobId: string | undefined, templateId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.templateOriginalPreview(jobId!, templateId!),
    queryFn: () => fetchTemplateOriginalPreview(jobId!, templateId!),
    enabled: !!jobId && !!templateId && enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useLatestTemplate(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.latestTemplate(jobId!),
    queryFn: () => fetchLatestTemplate(jobId!),
    enabled: !!jobId && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useJobFiles(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobFiles(jobId!),
    queryFn: () => fetchJobFiles(jobId!),
    enabled: !!jobId,
  });
}

export function useJobLogs(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobLogs(jobId!),
    queryFn: () => fetchJobLogs(jobId!),
    enabled: !!jobId,
  });
}

export function useJobs() {
  return useQuery({
    queryKey: queryKeys.jobs(),
    queryFn: fetchJobs,
  });
}

export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.job(jobId!),
    queryFn: () => fetchJob(jobId!),
    enabled: !!jobId,
    staleTime: 30_000,
  });
}
