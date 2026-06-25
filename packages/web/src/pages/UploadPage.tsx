import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob, uploadFile } from '../lib/api';

export default function UploadPage() {
  const navigate = useNavigate();
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [caseFiles, setCaseFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateFile || caseFiles.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const { id } = await createJob();
      await uploadFile(id, templateFile);
      for (const pdfFile of caseFiles) {
        await uploadFile(id, pdfFile);
      }
      navigate(`/jobs/${id}/generate`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 16px' }}>
      <h1>Upload Documents</h1>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #f87171',
            color: '#b91c1c',
            borderRadius: 6,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="template" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Template (.docx)
          </label>
          <input
            id="template"
            type="file"
            accept=".docx"
            required
            onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label htmlFor="caseDocs" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Case Documents (.pdf)
          </label>
          <input
            id="caseDocs"
            type="file"
            accept=".pdf"
            multiple
            required
            onChange={(e) => setCaseFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 24px',
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Uploading...' : 'Upload & Continue'}
        </button>
      </form>
    </div>
  );
}
