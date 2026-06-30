import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { ChangeRow } from '../lib/api';
import { useJobChanges } from '../hooks/useJobQueries';
import { useDeleteJobChange } from '../hooks/useJobMutations';

interface TrackChangesToolbarProps {
  editor: Editor;
  jobId: string;
  enabled: boolean;
  onToggle: () => void;
}

export function TrackChangesToolbar({ editor, jobId, enabled, onToggle }: TrackChangesToolbarProps) {
  const [error, setError] = useState<string | null>(null);
  const marksAppliedRef = useRef(false);

  const { data: changes = [], isLoading: loading } = useJobChanges(jobId, enabled);
  const deleteMutation = useDeleteJobChange(jobId);

  // Apply marks when Track Changes is enabled and data first arrives
  useEffect(() => {
    if (!enabled) {
      marksAppliedRef.current = false;
      editor.chain().selectAll().unsetMark('trackInsert').unsetMark('trackDelete').run();
      return;
    }
    if (!changes.length || marksAppliedRef.current) return;
    marksAppliedRef.current = true;
    for (const c of changes) {
      try {
        const delta = c.contentDelta as { from?: number; to?: number; text?: string };
        if (typeof delta?.from !== 'number' || typeof delta?.to !== 'number') continue;
        const { from, to } = delta;
        const markName = c.operationType === 'delete' ? 'trackDelete' : 'trackInsert';
        editor
          .chain()
          .setTextSelection({ from, to })
          .setMark(markName, {
            changeId: c.id,
            userName: c.userName,
            createdAt: c.createdAt,
          })
          .run();
      } catch {
        // skip unparseable deltas
      }
    }
  }, [changes, enabled, editor]);

  function findMarkRanges(
    doc: ProseMirrorNode,
    markName: string,
    changeId: string,
  ): Array<{ from: number; to: number }> {
    const ranges: Array<{ from: number; to: number }> = [];
    doc.descendants((node, pos) => {
      if (node.isText) {
        const mark = node.marks.find(
          (m) => m.type.name === markName && m.attrs.changeId === changeId,
        );
        if (mark) {
          ranges.push({ from: pos, to: pos + node.nodeSize });
        }
      }
    });
    return ranges;
  }

  function handleAccept(change: ChangeRow) {
    const isInsert =
      change.operationType === 'insert' || change.operationType === 'insertion';
    const isDelete =
      change.operationType === 'delete' || change.operationType === 'deletion';
    const markName = isInsert ? 'trackInsert' : 'trackDelete';

    setError(null);

    deleteMutation.mutate(change.id, {
      onSuccess: () => {
        const ranges = findMarkRanges(editor.state.doc, markName, change.id);
        if (isInsert) {
          for (const { from, to } of ranges) {
            editor.chain().setTextSelection({ from, to }).unsetMark(markName).run();
          }
        } else if (isDelete) {
          const sorted = [...ranges].sort((a, b) => b.from - a.from);
          for (const { from, to } of sorted) {
            editor.chain().deleteRange({ from, to }).run();
          }
        }
      },
      onError: (err) => {
        console.error('Failed to accept change:', err);
        setError('Failed to accept change. The mark has been kept in the document. Please try again.');
      },
    });
  }

  function handleReject(change: ChangeRow) {
    const isInsert =
      change.operationType === 'insert' || change.operationType === 'insertion';
    const isDelete =
      change.operationType === 'delete' || change.operationType === 'deletion';
    const markName = isInsert ? 'trackInsert' : 'trackDelete';

    setError(null);

    deleteMutation.mutate(change.id, {
      onSuccess: () => {
        const ranges = findMarkRanges(editor.state.doc, markName, change.id);
        if (isInsert) {
          const sorted = [...ranges].sort((a, b) => b.from - a.from);
          for (const { from, to } of sorted) {
            editor.chain().deleteRange({ from, to }).run();
          }
        } else if (isDelete) {
          const delta = change.contentDelta as { text?: string; from?: number } | null;
          if (delta && typeof delta.text === 'string' && ranges.length === 0 && typeof delta.from === 'number') {
            editor.chain().insertContentAt(delta.from, delta.text).run();
          } else {
            for (const { from, to } of ranges) {
              editor.chain().setTextSelection({ from, to }).unsetMark(markName).run();
            }
          }
        }
      },
      onError: (err) => {
        console.error('Failed to reject change:', err);
        setError('Failed to reject change. The mark has been kept in the document. Please try again.');
      },
    });
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
      {/* Toolbar header row */}
      <div className="flex items-center gap-3">
        <button
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            enabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
          }`}
          onClick={onToggle}
        >
          Track Changes
        </button>

        {enabled && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {loading ? 'Loading…' : `${changes.length} change${changes.length !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      {/* Change list */}
      {enabled && !loading && changes.length > 0 && (
        <ul className="space-y-2">
          {changes.map((change) => (
            <li
              key={change.id}
              className="flex items-center gap-2 text-sm border border-gray-100 rounded-md px-3 py-2 bg-gray-50"
            >
              {/* Operation badge */}
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                  change.operationType === 'delete'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {change.operationType}
              </span>

              {/* Author + timestamp */}
              <span className="flex-1 text-gray-700 truncate">
                <span className="font-medium">{change.userName}</span>
                <span className="text-gray-400 ml-1">·</span>
                <span className="text-gray-500 ml-1">
                  {new Date(change.createdAt).toLocaleString()}
                </span>
              </span>

              {/* Accept / Reject buttons */}
              <button
                className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => handleAccept(change)}
              >
                Accept
              </button>
              <button
                className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200"
                onClick={() => handleReject(change)}
              >
                Reject
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Empty state */}
      {enabled && !loading && changes.length === 0 && (
        <p className="text-sm text-gray-400 italic">No tracked changes for this job.</p>
      )}
    </div>
  );
}
