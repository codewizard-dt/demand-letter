import { Link } from 'react-router-dom';
import { useJobFiles, useLatestTemplate } from '../hooks/useJobQueries';

const STEPS = ['Template', 'Case Documents', 'Gap Report', 'Generate', 'Editor', 'Done'];

interface Props {
  currentStep: number; // 0-indexed
  jobId?: string;
  templateId?: string;
  className?: string;
}

function getStepHref(step: number, jobId?: string, templateId?: string): string | null {
  if (step === 0) {
    if (jobId && templateId) return `/jobs/${jobId}/templates/${templateId}/annotate`;
    if (jobId) return null;
    return '/upload';
  }
  if (!jobId) return null;
  if (step === 1) return `/jobs/${jobId}/documents`;
  if (step === 2) return `/jobs/${jobId}/gap-report`;
  if (step === 3) return `/jobs/${jobId}/generate`;
  if (step === 4) return `/jobs/${jobId}/editor`;
  return null;
}

export default function WorkflowStepper({ currentStep, jobId, templateId, className = '' }: Props) {
  const latestTemplateQuery = useLatestTemplate(jobId, !!jobId && !templateId);
  const filesQuery = useJobFiles(jobId);
  const resolvedTemplateId = templateId ?? latestTemplateQuery.data?.templateId;
  const hasCaseDocuments = (filesQuery.data ?? []).some((file) => file.role === 'case_doc');
  return (
    <nav aria-label="Workflow progress" className={`flex items-center gap-0 mb-8 ${className}`}>
      {STEPS.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        const unlockedByCaseDocuments = hasCaseDocuments && (i === 1 || i === 2);
        const href = done || unlockedByCaseDocuments ? getStepHref(i, jobId, resolvedTemplateId) : null;
        const pillClassName = `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          active ? 'bg-primary text-white' : done || href ? 'text-primary' : 'text-text-muted'
        } ${href ? 'hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : ''}`;
        const content = (
          <>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
              active ? 'bg-white text-primary border-white' : done ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-400'
            }`}>
              {done ? '✓' : i + 1}
            </span>
            {label}
          </>
        );

        return (
          <div key={label} className="flex items-center">
            {href ? (
              <Link to={href} className={pillClassName} aria-label={`Go back to ${label}`}>
                {content}
              </Link>
            ) : (
              <div className={pillClassName} aria-current={active ? 'step' : undefined}>
                {content}
              </div>
            )}
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px ${i < currentStep ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
