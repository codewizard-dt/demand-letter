import { useQuery } from '@tanstack/react-query';
import mammoth from 'mammoth';
import { queryKeys } from './queryKeys';
import {
  fetchLlmCosts,
  fetchGapReport,
  fetchOutputUrl,
  fetchExtractedFields,
  fetchBlocks,
  fetchJobChanges,
  fetchRefinements,
  getTemplateZones,
} from '../lib/api';

export function useLlmCosts(days = 30) {
  return useQuery({
    queryKey: queryKeys.llmCosts(days),
    queryFn: () => fetchLlmCosts(days),
  });
}

export function useGapReport(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.gapReport(jobId!),
    queryFn: () => fetchGapReport(jobId!),
    enabled: !!jobId,
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
      const resp = await fetch(url!);
      if (!resp.ok) throw new Error(`S3 fetch failed: ${resp.status}`);
      const buf = await resp.arrayBuffer();
      const { value } = await mammoth.convertToHtml(
        { arrayBuffer: buf },
        {
          styleMap: [
            "p[style-name='Boilerplate'] => p.boilerplate-zone:fresh",
            "r[style-name='Boilerplate'] => span.boilerplate-zone",
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
