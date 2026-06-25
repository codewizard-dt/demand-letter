import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import mammoth from 'mammoth';
import { fetchOutputUrl } from '../lib/api';
import { BoilerplateZone } from '../lib/editor/boilerplateZoneMark';
import { useAuth } from '../lib/auth';
import { TrackInsert, TrackDelete } from '../lib/editor/trackChangeMarks';
import { TrackChangesToolbar } from '../components/TrackChangesToolbar';

/**
 * EditorPage — loads a completed job's DOCX output, converts it to HTML via
 * mammoth, and opens it in a TipTap editor for attorney review and refinement.
 *
 * Flow: fetchOutputUrl(id) → presigned S3 URL → arrayBuffer → mammoth → HTML → TipTap
 * The wrapper div's class "tiptap-editor" is used for UAT targeting.
 */
// Real-time sync requires VITE_WS_API_URL to point to a deployed WebSocket API

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(false);

  const { user } = useAuth();
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

  // Fetch DOCX from presigned URL and convert to HTML on mount
  useEffect(() => {
    if (!id) return;
    async function loadDocx() {
      try {
        const url = await fetchOutputUrl(id!);
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        const { value } = await mammoth.convertToHtml(
          { arrayBuffer: buf },
          {
            styleMap: [
              "p[style-name='Boilerplate'] => p.boilerplate-zone:fresh",
              "r[style-name='Boilerplate'] => span.boilerplate-zone",
            ],
          }
        );
        setHtml(value);
      } catch (err) {
        console.error('Failed to load DOCX:', err);
        setHtml('<p>Error loading document.</p>');
      } finally {
        setLoading(false);
      }
    }
    loadDocx();
  }, [id]);

  // Seed Y.Doc from mammoth HTML once both editor and HTML are ready
  useEffect(() => {
    if (editor && html !== null) {
      // One-time seed: only apply if the Y.Doc fragment is empty
      const fragment = ydoc.getXmlFragment('default');
      if (fragment.length === 0) {
        editor.commands.setContent(html, { emitUpdate: false }); // don't emit history step
      }
    }
  }, [editor, html, ydoc]);

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
      <h1 className="text-2xl font-bold mb-6">Edit Demand Letter</h1>
      {!import.meta.env.VITE_WS_API_URL && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-amber-800 text-sm">
          Collaborative editing requires a deployed WebSocket server. Export to Word is still available.
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
