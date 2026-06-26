import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import { useOutputUrl, useDocxHtml } from '../hooks/useJobQueries';
import { useDownloadExportDocx } from '../hooks/useJobMutations';
import { BoilerplateZone } from '../lib/editor/boilerplateZoneMark';
import { useAuth } from '../lib/auth';
import { TrackInsert, TrackDelete } from '../lib/editor/trackChangeMarks';
import { TrackChangesToolbar } from '../components/TrackChangesToolbar';
import WorkflowStepper from '../components/WorkflowStepper';

/**
 * EditorPage — loads a completed job's DOCX output, converts it to HTML via
 * mammoth, and opens it in a TipTap editor for attorney review and refinement.
 *
 * Flow: fetchOutputUrl(id) → presigned S3 URL → arrayBuffer → mammoth → HTML → TipTap
 * The wrapper div's class "tiptap-editor" is used for UAT targeting.
 */
// Real-time sync requires VITE_WS_API_URL to point to a deployed WebSocket API

import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function EditorPage() {
  useDocumentTitle('Editor — Steno');
  const { id } = useParams<{ id: string }>();
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false);
  const [wsBannerDismissed, setWsBannerDismissed] = useState(false);

  const { user } = useAuth();
  const outputUrlQuery = useOutputUrl(id);
  const docxHtmlQuery = useDocxHtml(id, outputUrlQuery.data);
  const downloadMutation = useDownloadExportDocx();

  const userId = user?.email ?? 'anonymous';
  const userName = user?.name ?? 'Anonymous';

  const ydoc = useMemo(() => new Y.Doc(), []);

  const wsUrl = `${import.meta.env.VITE_WS_API_URL as string}?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`;
  const provider = useMemo(
    () => new WebsocketProvider(wsUrl, `job-${id}`, ydoc),
    [wsUrl, id, ydoc]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: userName, color: '#6366f1' },
      }),
      BoilerplateZone,
      TrackInsert,
      TrackDelete,
    ],
  });

  useEffect(() => () => { provider.destroy(); }, [provider]);

  // Seed Y.Doc from mammoth HTML once both editor and HTML are ready
  useEffect(() => {
    const html = docxHtmlQuery.data ?? null;
    if (editor && html !== null) {
      // One-time seed: only apply if the Y.Doc fragment is empty
      const fragment = ydoc.getXmlFragment('default');
      if (fragment.length === 0) {
        editor.commands.setContent(html, { emitUpdate: false }); // don't emit history step
      }
    }
  }, [editor, docxHtmlQuery.data, ydoc]);

  const loading = outputUrlQuery.isLoading || docxHtmlQuery.isLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-5 w-5 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="text-blue-700 font-medium">Loading document…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <WorkflowStepper currentStep={3} />
      <h1 className="text-2xl font-bold mb-6">Edit Demand Letter</h1>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => downloadMutation.mutate(id!)}
          disabled={downloadMutation.isPending}
          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
        >
          {downloadMutation.isPending ? 'Exporting…' : 'Export to Word'}
        </button>
      </div>
      {!import.meta.env.VITE_WS_API_URL && !wsBannerDismissed && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-amber-800 text-sm flex justify-between items-center">
          <span>Collaborative editing requires a deployed WebSocket server. Export to Word is still available.</span>
          <button
            onClick={() => setWsBannerDismissed(true)}
            aria-label="Dismiss"
            className="ml-4 text-amber-600 hover:text-amber-900 font-bold leading-none"
          >
            ×
          </button>
        </div>
      )}
      {editor && (
        <TrackChangesToolbar
          editor={editor}
          jobId={id!}
          enabled={trackChangesEnabled}
          onToggle={() => setTrackChangesEnabled(v => !v)}
        />
      )}
      <div className="tiptap-editor prose max-w-none border border-gray-200 rounded-lg p-6 min-h-[60vh] focus-within:ring-2 focus-within:ring-blue-500">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
