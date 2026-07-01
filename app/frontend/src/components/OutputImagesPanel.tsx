import { useOutputImages } from '../hooks/useJobQueries';
import { useReplaceOutputImage, useAddOutputImage } from '../hooks/useJobMutations';

/**
 * Lets the user swap or add images in the BODY of the generated letter from the
 * refine/review page. Header/footer images (e.g. the firm logo) are edited on
 * the template page instead, so only body images are listed here. Each change
 * rewrites the output DOCX server-side and invalidates the preview.
 */
export function OutputImagesPanel({ jobId, isDone }: { jobId: string; isDone: boolean }) {
  const imagesQuery = useOutputImages(jobId, isDone);
  const replaceMutation = useReplaceOutputImage(jobId);
  const addMutation = useAddOutputImage(jobId);

  if (!isDone) return null;

  const images = imagesQuery.data ?? [];
  const errorMessage = replaceMutation.error ?? addMutation.error;

  return (
    <section className="mt-4 rounded border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800">Document Images</h2>
        <label className="btn-outline cursor-pointer px-3 py-1 text-xs">
          {addMutation.isPending ? 'Adding…' : 'Add Image'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addMutation.mutate(file);
              e.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      {imagesQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading images…</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-gray-400">
          No images in the letter body yet. Use “Add Image” to insert one.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {images.map((image) => (
            <span
              key={image.target}
              className="group relative inline-flex w-fit rounded border border-gray-200 bg-gray-50 p-1"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith('image/')) replaceMutation.mutate({ target: image.target, file });
              }}
            >
              <img
                src={image.dataUrl}
                alt={image.target.split('/').pop() ?? 'Body image'}
                className="max-h-32 max-w-[220px] object-contain"
              />
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 px-2 text-center text-[11px] font-medium text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100">
                Drop or click to replace
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) replaceMutation.mutate({ target: image.target, file });
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </span>
          ))}
        </div>
      )}

      {replaceMutation.isPending && <p className="mt-2 text-xs text-gray-500">Updating image…</p>}
      {errorMessage && (
        <p className="mt-2 text-xs text-red-600">{errorMessage instanceof Error ? errorMessage.message : 'Image update failed.'}</p>
      )}
    </section>
  );
}
