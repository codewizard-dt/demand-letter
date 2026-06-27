import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadWorkflow } from '../hooks/useJobMutations';

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import WorkflowStepper from '../components/WorkflowStepper';

export default function UploadPage() {
  useDocumentTitle('Upload Documents — Steno');
  const navigate = useNavigate();
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [caseFiles, setCaseFiles] = useState<File[]>([]);
  const [templateDrag, setTemplateDrag] = useState(false);
  const [caseDrag, setCaseDrag] = useState(false);
  const uploadMutation = useUploadWorkflow();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateFile || caseFiles.length === 0) return;
    uploadMutation.mutate(
      { templateFile, caseFiles },
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
            onDrop={(e) => { e.preventDefault(); setCaseDrag(false); setCaseFiles(Array.from(e.dataTransfer.files)); }}
            onClick={() => document.getElementById('caseDocs')?.click()}
          >
            <input id="caseDocs" type="file" accept=".pdf" multiple aria-hidden="true" className="hidden" onChange={(e) => setCaseFiles(Array.from(e.target.files ?? []))} />
            {caseFiles.length > 0 ? (
              <ul className="text-sm text-primary font-medium space-y-0.5">
                {caseFiles.map((f) => <li key={f.name}>{f.name}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">Drag .pdf files here or <span className="text-primary underline">browse</span></p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2.5 text-base font-medium rounded-md bg-primary text-white transition-colors ${loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-primary/90'}`}
        >
          {loading ? 'Uploading & processing…' : 'Upload & Continue'}
        </button>
      </form>
    </div>
  );
}
