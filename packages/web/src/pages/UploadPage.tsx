import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadWorkflow } from '../hooks/useJobMutations';

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import WorkflowStepper from '../components/WorkflowStepper';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UploadPage() {
  useDocumentTitle('Upload Documents — Steno');
  const navigate = useNavigate();
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [caseFiles, setCaseFiles] = useState<File[]>([]);
  const [templateDrag, setTemplateDrag] = useState(false);
  const [caseDrag, setCaseDrag] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const uploadMutation = useUploadWorkflow();

  function appendCaseFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files);
    if (nextFiles.length === 0) return;
    setCaseFiles(prev => [...prev, ...nextFiles]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateFile || caseFiles.length === 0) return;
    setUploadStatus('Starting upload…');
    uploadMutation.mutate(
      { templateFile, caseFiles, onStatus: setUploadStatus },
      { onSuccess: (id) => navigate(`/jobs/${id}/gap-report`) },
    );
  }

  const loading = uploadMutation.isPending;
  const error = uploadMutation.error ? String(uploadMutation.error) : null;

  return (
    <div className="max-w-[480px] mx-auto mt-12 px-4">
      <WorkflowStepper currentStep={0} />
      <h1>Upload Documents</h1>

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
            onDragLeave={() => setTemplateDrag(false)}
            onDrop={(e) => { e.preventDefault(); setTemplateDrag(false); const f = e.dataTransfer.files[0]; if (f) setTemplateFile(f); }}
            onClick={() => document.getElementById('template')?.click()}
          >
            <input id="template" type="file" accept=".docx" aria-hidden="true" className="hidden" onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)} />
            {templateFile ? (
              <p className="text-sm text-primary font-medium">{templateFile.name}</p>
            ) : (
              <p className="text-sm text-text-muted">Drag a .docx file here or <span className="text-primary underline">browse</span></p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-1.5 font-semibold">Case Documents (.pdf)</label>
          <div
            className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${caseDrag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}`}
            onDragOver={(e) => { e.preventDefault(); setCaseDrag(true); }}
            onDragLeave={() => setCaseDrag(false)}
            onDrop={(e) => { e.preventDefault(); setCaseDrag(false); appendCaseFiles(e.dataTransfer.files); }}
            onClick={() => document.getElementById('caseDocs')?.click()}
          >
            <input
              id="caseDocs"
              type="file"
              accept=".pdf"
              multiple
              aria-hidden="true"
              className="hidden"
              onChange={(e) => {
                appendCaseFiles(e.target.files ?? []);
                e.currentTarget.value = '';
              }}
            />
            {caseFiles.length > 0 ? (
              <ul className="text-sm text-primary font-medium space-y-0.5">
                {caseFiles.map((f, index) => <li key={`${f.name}-${f.lastModified}-${index}`}>{f.name}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">Drag .pdf files here or <span className="text-primary underline">browse</span></p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Uploading & processing…' : 'Upload & Continue'}
        </button>
      </form>
    </div>
  );
}
