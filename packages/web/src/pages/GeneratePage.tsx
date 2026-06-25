import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { generateJob, downloadOutput } from '../lib/api';

export default function GeneratePage() {
  const { id } = useParams<{ id: string }>();
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setOutput('');
    try {
      await generateJob(id!, (chunk) => setOutput((prev) => prev + chunk));
      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      let blob: Blob | null = null;
      while (!blob) {
        blob = await downloadOutput(id!);
        if (!blob) await new Promise((r) => setTimeout(r, 2000));
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `demand-letter-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Generate Demand Letter</h1>

      {!isDone && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isGenerating ? 'Generating…' : 'Generate Demand Letter'}
        </button>
      )}

      {error && (
        <p className="mt-4 text-red-600">{error}</p>
      )}

      {output && (
        <pre className="mt-6 whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm">
          {output}
        </pre>
      )}

      {isDone && (
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {isDownloading ? 'Preparing download…' : 'Download Demand Letter'}
        </button>
      )}
    </div>
  );
}
