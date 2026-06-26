import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Zone } from '../lib/api';
import { useTemplateZones } from '../hooks/useJobQueries';
import { usePatchTemplateZones } from '../hooks/useJobMutations';

type ZoneRow = Zone & { confirmed: boolean };

export default function AnnotatePage() {
  const { id: jobId, templateId } = useParams<{ id: string; templateId: string }>();
  const [zones, setZones] = useState<ZoneRow[]>([]);

  const zonesQuery = useTemplateZones(jobId, templateId);
  const patchMutation = usePatchTemplateZones(jobId!, templateId!);

  useEffect(() => {
    if (zonesQuery.data) setZones(zonesQuery.data as ZoneRow[]);
  }, [zonesQuery.data]);

  const loading = zonesQuery.isLoading;
  const error = zonesQuery.error ? String(zonesQuery.error) : patchMutation.error ? String(patchMutation.error) : null;
  const submitting = patchMutation.isPending;

  function confirmAll() {
    setZones((prev) =>
      prev.map((z) =>
        z.type === 'variable_populated' ? { ...z, confirmed: true } : z,
      ),
    );
  }

  function updateZone(id: string, patch: Partial<ZoneRow>) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  function handleSubmit() {
    patchMutation.mutate(zones, {
      onSuccess: () => alert('Zones saved successfully.'),
    });
  }

  if (loading) return <div className="p-8">Loading zones…</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Template Zone Annotation</h1>
      <div className="mb-4 flex gap-3">
        <button
          onClick={confirmAll}
          className="px-4 py-2 bg-teal-700 text-white rounded hover:bg-teal-800"
        >
          Confirm All Variable Zones
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Submit Annotations'}
        </button>
      </div>
      <div className="space-y-3">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`border rounded p-4 ${zone.confirmed ? 'border-teal-400 bg-teal-50' : 'border-gray-200'}`}
          >
            <p className="text-sm text-gray-500 mb-1">Zone {zone.zoneIndex}</p>
            <p className="font-mono text-sm mb-3 truncate">{zone.textContent}</p>
            <div className="flex gap-2 items-center flex-wrap">
              <button
                onClick={() => updateZone(zone.id, { type: 'boilerplate_verbatim', confirmed: false })}
                className={`px-3 py-1 text-sm rounded border ${zone.type === 'boilerplate_verbatim' ? 'bg-amber-100 border-amber-400' : 'border-gray-300'}`}
              >
                Boilerplate
              </button>
              <button
                onClick={() => updateZone(zone.id, { type: 'variable_populated', confirmed: false })}
                className={`px-3 py-1 text-sm rounded border ${zone.type === 'variable_populated' ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}
              >
                Variable
              </button>
              {zone.type === 'variable_populated' && (
                <input
                  type="text"
                  value={zone.suggestedFieldName ?? ''}
                  onChange={(e) => updateZone(zone.id, { suggestedFieldName: e.target.value })}
                  placeholder="field_name"
                  className="border rounded px-2 py-1 text-sm flex-1 min-w-32"
                />
              )}
              <button
                onClick={() => updateZone(zone.id, { confirmed: !zone.confirmed })}
                className={`px-3 py-1 text-sm rounded border ml-auto ${zone.confirmed ? 'bg-teal-100 border-teal-400' : 'border-gray-300'}`}
              >
                {zone.confirmed ? 'Confirmed ✓' : 'Confirm'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
