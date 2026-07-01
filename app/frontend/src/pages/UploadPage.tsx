import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadTemplateWorkflow } from '../hooks/useJobMutations';

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import WorkflowStepper from '../components/WorkflowStepper';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UploadPage() {
  useDocumentTitle('Upload Template — Steno');
  const navigate = useNavigate();
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateDrag, setTemplateDrag] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const uploadMutation = useUploadTemplateWorkflow();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateFile) return;
    setUploadStatus('Starting template upload…');
    uploadMutation.mutate(
      { templateFile, onStatus: setUploadStatus },
      { onSuccess: ({ jobId, templateId }) => { navigate(`/jobs/${jobId}/templates/${templateId}/annotate`); } },
    );
  }

  const loading = uploadMutation.isPending;
  const error = uploadMutation.error ? String(uploadMutation.error) : null;

  return (
    <div className="flex justify-center px-4 py-14">
      <div className="w-full max-w-[700px]">
        <WorkflowStepper currentStep={0} className="justify-center" />
        <div className="mx-auto max-w-[480px]">
          <h1>Upload Template</h1>

          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 rounded-md px-4 py-3 mb-4"
            >
              {error}
            </div>
          )}

          {loading && uploadStatus && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 st-status-banner"
            >
              <LoadingSpinner className="h-4 w-4 text-primary" />
              <span>{uploadStatus}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block mb-1.5 font-semibold">Template (.docx)</label>
              <div
                className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${templateDrag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}`}
                onDragOver={(e) => { e.preventDefault(); setTemplateDrag(true); }}
                onDragLeave={() => { setTemplateDrag(false); }}
                onDrop={(e) => { e.preventDefault(); setTemplateDrag(false); const f = e.dataTransfer.files[0]; if (f) setTemplateFile(f); }}
                onClick={() => document.getElementById('template')?.click()}
              >
                <input id="template" type="file" accept=".docx" aria-hidden="true" className="hidden" onChange={(e) => { setTemplateFile(e.target.files?.[0] ?? null); }} />
                {templateFile ? (
                  <p className="text-sm text-primary font-medium">{templateFile.name}</p>
                ) : (
                  <p className="text-sm text-text-muted">Drag a .docx file here or <span className="text-primary underline">browse</span></p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !templateFile}
              className="btn-primary"
            >
              {loading ? 'Uploading & parsing…' : 'Upload Template'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
