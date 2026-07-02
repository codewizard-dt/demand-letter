import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { useOutputUrl, useDocxHtml } from '../hooks/useJobQueries';
import { useExportDocx, useSaveEditorContent } from '../hooks/useJobMutations';
import { BoilerplateZone } from '../lib/editor/boilerplateZoneMark';
import { useAuth } from '../lib/auth';
import { TrackInsert, TrackDelete } from '../lib/editor/trackChangeMarks';
import { TrackChangesToolbar } from '../components/TrackChangesToolbar';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * EditorPage — loads a completed job's DOCX output, converts it to HTML via
 * mammoth, and opens it in a TipTap editor for attorney review and refinement.
 *
 * Flow: fetchOutputUrl(id) → output/docx API proxy → arrayBuffer → mammoth → HTML → TipTap
 * The wrapper div's class "tiptap-editor" is used for UAT targeting.
 */
// Real-time sync requires VITE_WS_API_URL to point to a deployed WebSocket API

import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function EditorPage() {
  useDocumentTitle('Editor — Steno');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false);
  const [wsBannerDismissed, setWsBannerDismissed] = useState(false);

  const { user } = useAuth();
  const outputUrlQuery = useOutputUrl(id);
  const docxHtmlQuery = useDocxHtml(id, outputUrlQuery.data);
  const exportMutation = useExportDocx();
  const saveMutation = useSaveEditorContent();

  const userId = user?.email ?? 'anonymous';
  const userName = user?.name ?? 'Anonymous';

  const ydoc = useMemo(() => new Y.Doc(), []);

  const wsApiUrl = import.meta.env.VITE_WS_API_URL as string | undefined;
  const wsUrl = wsApiUrl
    ? `${wsApiUrl}?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`
    : null;
  const provider = useMemo(
    () => (wsUrl ? new WebsocketProvider(wsUrl, `job-${id}`, ydoc) : null),
    [wsUrl, id, ydoc]
  );

  const editorExtensions = useMemo(
    () => [
      StarterKit,
      ...(provider
        ? [
            Collaboration.configure({ document: ydoc }),
            CollaborationCaret.configure({
              provider,
              user: { name: userName, color: '#6366f1' },
            }),
          ]
        : []),
      BoilerplateZone,
      TrackInsert,
      TrackDelete,
    ],
    [provider, userName, ydoc],
  );

  const editor = useEditor({
    extensions: editorExtensions,
  });

  useEffect(() => () => { provider?.destroy(); }, [provider]);

  useEffect(() => {
    const html = docxHtmlQuery.data ?? null;
    if (editor && html !== null) {
      const fragment = ydoc.getXmlFragment('default');
      if (fragment.length === 0) {
        editor.commands.setContent(html, { emitUpdate: false });
      }
    }
  }, [editor, docxHtmlQuery.data, ydoc]);

  const loading = outputUrlQuery.isLoading || docxHtmlQuery.isLoading;

  function handleExport() {
    if (!id || !editor) return;
    exportMutation.mutate(
      { jobId: id, doc: editor.getJSON() },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'demand-letter.docx';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
      },
    );
  }

  function handleSaveAndReturn() {
    if (!id || !editor) return;
    saveMutation.mutate(
      { jobId: id, doc: editor.getJSON() },
      { onSuccess: () => { navigate(`/jobs/${id}/generate`); } },
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <LoadingSpinner className="h-5 w-5 text-primary" />
          <span className="text-primary font-medium">Loading document…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to={`/jobs/${id}/generate`}
            className="text-sm text-primary hover:underline"
          >
            ← Back to Generate & Review
          </Link>
          <h1 className="text-2xl font-bold mt-1">Edit Demand Letter</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAndReturn}
            disabled={saveMutation.isPending || !editor}
            className="btn-primary"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save & Return to Review'}
          </button>
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending || !editor}
            className="btn-outline"
          >
            {exportMutation.isPending ? 'Exporting…' : 'Export to Word'}
          </button>
        </div>
      </div>

      {saveMutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          Save failed: {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unknown error'}
        </div>
      )}

      {!import.meta.env.VITE_WS_API_URL && !wsBannerDismissed && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-amber-800 text-sm flex justify-between items-center">
          <span>Collaborative editing requires a deployed WebSocket server. Export to Word is still available.</span>
          <button
            onClick={() => { setWsBannerDismissed(true); }}
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
          onToggle={() => { setTrackChangesEnabled(v => !v); }}
        />
      )}
      <div className="tiptap-editor prose max-w-none border border-gray-200 rounded-lg p-6 min-h-[60vh] focus-within:ring-2 focus-within:ring-blue-500">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
