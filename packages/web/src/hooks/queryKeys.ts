export const queryKeys = {
  llmCosts:        (days: number)                            => ['llmCosts', days]                   as const,
  gapReport:       (jobId: string)                           => ['gapReport', jobId]                  as const,
  outputUrl:       (jobId: string)                           => ['outputUrl', jobId]                   as const,
  extractedFields: (jobId: string)                           => ['extractedFields', jobId]             as const,
  blocks:          (jobId: string, limit?: number)           => ['blocks', jobId, limit]               as const,
  jobChanges:      (jobId: string)                           => ['jobChanges', jobId]                  as const,
  refinements:     (jobId: string)                           => ['refinements', jobId]                 as const,
  templateZones:   (jobId: string, templateId: string)       => ['templateZones', jobId, templateId]   as const,
  docxHtml:        (jobId: string, url: string | undefined)  => ['docxHtml', jobId, url]              as const,
};
