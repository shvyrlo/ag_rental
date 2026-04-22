import { Fragment, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

// Admin view: inspections grouped by equipment unit.
// Top-level rows are units; click a unit to see every inspection on it,
// including client name, kind, photos, and pass/fail/delete actions.
export default function AdminInspections() {
  const [inspections, setInspections] = useState([]);
  const [error, setError] = useState(null);
  const [openUnit, setOpenUnit] = useState(null);         // equipment_id currently expanded
  const [openPhotos, setOpenPhotos] = useState(null);     // inspection id whose photos are open
  const [photosByInspection, setPhotosByInspection] = useState({});
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  async function load() {
    try {
      setInspections(await api('/inspections'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  // Group inspections by equipment_id — one summary row per unit.
  const units = useMemo(() => {
    const byUnit = new Map();
    for (const i of inspections) {
      const key = i.equipment_id;
      if (!byUnit.has(key)) {
        byUnit.set(key, {
          equipment_id: i.equipment_id,
          equipment_name: i.equipment_name,
          equipment_unit_number: i.equipment_unit_number,
          inspections: [],
          pending: 0,
          pass: 0,
          fail: 0,
          lastAt: null,
        });
      }
      const u = byUnit.get(key);
      u.inspections.push(i);
      if (i.status === 'pending') u.pending++;
      else if (i.status === 'pass') u.pass++;
      else if (i.status === 'fail') u.fail++;
      const t = new Date(i.created_at).getTime();
      if (!u.lastAt || t > u.lastAt) u.lastAt = t;
    }
    const arr = Array.from(byUnit.values());
    // Newest activity first.
    arr.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    // Within a unit, newest inspection first.
    for (const u of arr) {
      u.inspections.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
    }
    return arr;
  }, [inspections]);

  async function updateStatus(id, patch) {
    try {
      if (patch.status === 'pass' || patch.status === 'fail') {
        patch.inspected_at = new Date().toISOString();
      }
      await api(`/inspections/${id}`, { method: 'PUT', body: patch });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeInspection(id) {
    if (!confirm('Delete this inspection and all its photos? This cannot be undone.')) return;
    try {
      await api(`/inspections/${id}`, { method: 'DELETE' });
      if (openPhotos === id) setOpenPhotos(null);
      setPhotosByInspection((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function togglePhotos(id) {
    if (openPhotos === id) {
      setOpenPhotos(null);
      return;
    }
    setOpenPhotos(id);
    if (!photosByInspection[id]) {
      setLoadingPhotos(true);
      try {
        const slots = await api(`/inspections/${id}/photos`);
        const photos = await Promise.all(
          slots.map((s) => api(`/inspections/${id}/photos/${s.slot}`)),
        );
        setPhotosByInspection((prev) => ({ ...prev, [id]: photos }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingPhotos(false);
      }
    }
  }

  function downloadPhoto(photo, inspectionId) {
    const link = document.createElement('a');
    link.href = photo.data;
    link.download = photo.name || `inspection-${inspectionId}-photo-${photo.slot}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function downloadAll(inspectionId) {
    const photos = photosByInspection[inspectionId];
    if (!photos) return;
    for (const p of photos) {
      downloadPhoto(p, inspectionId);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inspections</h1>
        <p className="text-slate-600">
          Pick an equipment unit to see every inspection submitted for it, then
          open photos and mark pass or fail.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700 text-left">
            <tr>
              <th className="px-4 py-2">Unit #</th>
              <th className="px-4 py-2">Equipment</th>
              <th className="px-4 py-2">Inspections</th>
              <th className="px-4 py-2">Breakdown</th>
              <th className="px-4 py-2">Last submitted</th>
              <th className="px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const isOpen = openUnit === u.equipment_id;
              return (
                <Fragment key={u.equipment_id}>
                  <tr
                    className={
                      'border-t border-slate-200 cursor-pointer hover:bg-slate-50 ' +
                      (isOpen ? 'bg-slate-50' : '')
                    }
                    onClick={() => {
                      setOpenUnit(isOpen ? null : u.equipment_id);
                      setOpenPhotos(null);
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {u.equipment_unit_number || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">{u.equipment_name}</td>
                    <td className="px-4 py-3">{u.inspections.length}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 space-x-2">
                      {u.pending > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <StatusBadge status="pending" /> {u.pending}
                        </span>
                      )}
                      {u.pass > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <StatusBadge status="pass" /> {u.pass}
                        </span>
                      )}
                      {u.fail > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <StatusBadge status="fail" /> {u.fail}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.lastAt ? new Date(u.lastAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {isOpen ? '▾' : '▸'}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-3">
                          {u.inspections.map((i) => {
                            const hasPhotos = (i.photo_count ?? 0) > 0;
                            const photosOpen = openPhotos === i.id;
                            return (
                              <div
                                key={i.id}
                                className="rounded-lg border border-slate-200 bg-white"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                                  <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium capitalize">
                                        {i.kind || '—'}-of-rental
                                      </span>
                                      <StatusBadge status={i.status} />
                                    </div>
                                    <div className="text-slate-600">
                                      Rental #{i.rental_id ?? '—'}
                                      {i.client_name && ` · ${i.client_name}`}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      Submitted {new Date(i.created_at).toLocaleString()}
                                      {' · '}{i.photo_count ?? 0}/6 photos
                                    </div>
                                    {i.notes && (
                                      <p className="text-sm text-slate-700 pt-1">
                                        <span className="font-medium">Notes: </span>{i.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 shrink-0">
                                    <button
                                      type="button"
                                      className={hasPhotos ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
                                      onClick={() => togglePhotos(i.id)}
                                      disabled={!hasPhotos}
                                      title={hasPhotos ? 'Open photo gallery' : 'No photos uploaded'}
                                    >
                                      {photosOpen ? 'Hide photos' : 'View photos'}
                                    </button>
                                    {i.status !== 'pass' && (
                                      <button
                                        className="btn-secondary text-xs"
                                        onClick={() => updateStatus(i.id, { status: 'pass' })}
                                      >
                                        Pass
                                      </button>
                                    )}
                                    {i.status !== 'fail' && (
                                      <button
                                        className="btn-danger text-xs"
                                        onClick={() => updateStatus(i.id, { status: 'fail' })}
                                      >
                                        Fail
                                      </button>
                                    )}
                                    <button
                                      className="btn-danger text-xs"
                                      onClick={() => removeInspection(i.id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                {photosOpen && (
                                  <div className="border-t border-slate-200 px-4 py-3">
                                    {loadingPhotos && !photosByInspection[i.id] ? (
                                      <p className="text-sm text-slate-500">Loading photos…</p>
                                    ) : photosByInspection[i.id]?.length ? (
                                      <>
                                        <div className="flex items-center justify-between mb-3">
                                          <p className="text-sm text-slate-600">
                                            {photosByInspection[i.id].length} photos — click
                                            any thumbnail to view full size.
                                          </p>
                                          <button
                                            type="button"
                                            className="btn-secondary text-xs"
                                            onClick={() => downloadAll(i.id)}
                                          >
                                            Download all
                                          </button>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                          {photosByInspection[i.id].map((p) => (
                                            <div
                                              key={p.slot}
                                              className="rounded-md border border-slate-200 bg-white p-2"
                                            >
                                              <button
                                                type="button"
                                                onClick={() => setLightbox(p)}
                                                className="block w-full"
                                                title="Click to view full size"
                                              >
                                                <img
                                                  src={p.data}
                                                  alt={p.name || `photo ${p.slot}`}
                                                  className="h-32 w-full object-cover rounded hover:opacity-90 transition"
                                                />
                                              </button>
                                              <div className="mt-2 flex items-center justify-between text-xs">
                                                <span className="text-slate-500">#{p.slot}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => downloadPhoto(p, i.id)}
                                                  className="text-slate-700 hover:underline"
                                                >
                                                  Download
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    ) : (
                                      <p className="text-sm text-slate-500">No photos on file.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {units.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  No inspections have been submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-5xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white text-sm mb-2">
              <span>{lightbox.name || `Photo ${lightbox.slot}`}</span>
              <div className="space-x-3">
                <a
                  href={lightbox.data}
                  download={lightbox.name || `photo-${lightbox.slot}`}
                  className="hover:underline"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
            <img
              src={lightbox.data}
              alt={lightbox.name || `photo ${lightbox.slot}`}
              className="max-h-[80vh] w-auto mx-auto rounded-md"
            />
          </div>
        </div>
      )}
    </div>
  );
}
