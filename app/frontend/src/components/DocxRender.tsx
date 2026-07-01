import { useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';

/**
 * Renders a .docx byte buffer as a faithful, Word-like page layout so the
 * on-screen preview matches the downloaded document — numbering, indentation,
 * headers/footers and justification all come from the DOCX itself (unlike the
 * approximate mammoth HTML conversion).
 */
export function DocxRender({ data }: { data: ArrayBuffer | undefined }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data) return;
    let cancelled = false;
    container.innerHTML = '';
    // docx-preview mutates the buffer's view; hand it a copy so a cached
    // react-query ArrayBuffer isn't consumed/detached on re-render.
    const copy = data.slice(0);
    void renderAsync(copy, container, undefined, {
      className: 'docx',
      inWrapper: true,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      ignoreLastRenderedPageBreak: false,
      experimental: true,
    }).catch(() => {
      if (!cancelled) container.innerHTML = '<p class="text-sm text-red-600">Failed to render document preview.</p>';
    });
    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [data]);

  return <div ref={containerRef} className="st-docx-render" />;
}
