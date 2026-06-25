---
id: TASK-029
title: "Attorney Annotation UI — Zone Review and Confirmation Page"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-028]
blocks: []
parallel_safe_with: []
uat: "[[UAT-029]]"
tags: [react, ui, annotation, zone-detection, attorney]
---

# TASK-029 — Attorney Annotation UI — Zone Review and Confirmation Page

implements::[[DEC-0001#D1]]

## Objective

Build a React page at `/jobs/:id/templates/:templateId/annotate` that displays the template's zones as a scrollable list. Each zone row shows its text excerpt, the LLM-proposed label (`boilerplate-verbatim` or `variable-populated`), and the suggested field name. Attorneys can confirm the label, override it, and rename the field name per zone. A "Confirm All" button auto-confirms every zone where the LLM proposal is `variable_populated` (high-confidence zones). On submit, all confirmed zones are sent to `PATCH /jobs/:id/templates/:templateId/zones` which persists the final labels and field names to the DB.

## Approach

Use React controlled state (`useState`) to hold a local copy of all zones with editable `type` and `fieldName` per zone. The zone list is fetched on mount from `GET /jobs/:id/templates/:templateId/zones`. The "Confirm All" button sets `confirmed = true` on all zones where `type === 'variable_populated'`. Each zone row has a label toggle (two-button: Boilerplate / Variable) and a text input for the field name, both disabled for confirmed zones unless the user clicks an "Edit" button. On submit, the client sends `PATCH` with the full zones array and navigates to the next step.

## Steps

### 1. Add API helper functions  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/lib/api.ts` (create it if it does not exist — currently `packages/web/src/main.tsx` may inline fetch calls). <!-- Completed: 2026-06-24 -->
- [x] Add: <!-- Completed: 2026-06-24 -->
  ```typescript
  export async function getTemplateZones(jobId: string, templateId: string) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/zones`);
    if (!res.ok) throw new Error(`Failed to fetch zones: ${res.status}`);
    return res.json() as Promise<Zone[]>;
  }

  export async function patchTemplateZones(
    jobId: string,
    templateId: string,
    zones: Array<{ id: string; type: string; suggestedFieldName: string | null; confirmed: boolean }>,
  ) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/templates/${templateId}/zones`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zones }),
    });
    if (!res.ok) throw new Error(`Failed to patch zones: ${res.status}`);
    return res.json();
  }
  ```

### 2. Create GET /jobs/:id/templates/:templateId/zones Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/get-jobs-template-zones.ts`: <!-- Completed: 2026-06-24 -->
  - Parse `jobId` from `event.pathParameters.id`, `templateId` from `event.pathParameters.templateId`.
  - Query: `prisma.zone.findMany({ where: { templateId }, orderBy: { zoneIndex: 'asc' } })`.
  - Return `200` with JSON array of zone objects.
- [x] Register in `template.yaml` as `GetJobsTemplateZonesFunction` on `GET /jobs/{id}/templates/{templateId}/zones`. <!-- Completed: 2026-06-24 -->

### 3. Create PATCH /jobs/:id/templates/:templateId/zones Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/patch-jobs-template-zones.ts`: <!-- Completed: 2026-06-24 -->
  - Parse body: `{ zones: Array<{ id, type, suggestedFieldName, confirmed, confirmedBy?, confirmedAt? }> }`.
  - For each zone, run `prisma.zone.update({ where: { id }, data: { type, suggestedFieldName, confirmed, confirmedBy: 'attorney', confirmedAt: new Date() } })` using `Promise.all`.
  - Return `200` with the updated zone list.
- [x] Register in `template.yaml` as `PatchJobsTemplateZonesFunction` on `PATCH /jobs/{id}/templates/{templateId}/zones`. <!-- Completed: 2026-06-24 -->

### 4. Build the AnnotatePage React component  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/pages/AnnotatePage.tsx`: <!-- Completed: 2026-06-24 -->
  ```tsx
  import { useEffect, useState } from 'react';
  import { useParams } from 'react-router-dom';
  import { getTemplateZones, patchTemplateZones } from '../lib/api';

  type ZoneRow = {
    id: string;
    zoneIndex: number;
    textContent: string;
    type: 'boilerplate_verbatim' | 'variable_populated' | null;
    suggestedFieldName: string | null;
    confirmed: boolean;
  };

  export default function AnnotatePage() {
    const { id: jobId, templateId } = useParams<{ id: string; templateId: string }>();
    const [zones, setZones] = useState<ZoneRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      getTemplateZones(jobId!, templateId!)
        .then(setZones)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, [jobId, templateId]);

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

    async function handleSubmit() {
      setSubmitting(true);
      try {
        await patchTemplateZones(jobId!, templateId!, zones);
        // navigate to next step (delimiter injection) — placeholder for now
        alert('Zones saved successfully.');
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setSubmitting(false);
      }
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
  ```

### 5. Wire route in App.tsx  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/App.tsx` (or wherever the router is defined). <!-- Completed: 2026-06-24 -->
- [x] Add: <!-- Completed: 2026-06-24 -->
  ```tsx
  import AnnotatePage from './pages/AnnotatePage';
  // ...
  <Route path="/jobs/:id/templates/:templateId/annotate" element={<AnnotatePage />} />
  ```

### 6. TypeScript typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the monorepo root. <!-- Completed: 2026-06-24 -->
- [x] Fix any type errors (common: `Zone` import from `@demand-letter/db`, `useParams` return types). <!-- Completed: 2026-06-24 -->
- [x] Confirm zero errors. <!-- Completed: 2026-06-24 -->
