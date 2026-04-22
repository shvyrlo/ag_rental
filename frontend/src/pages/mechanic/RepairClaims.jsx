import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { compressImage, renameToJpg, MAX_SOURCE_BYTES } from '../../lib/imageCompress.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function MechanicRepairClaims() {
  const [claims, setClaims] = useState([]);
  const [notesById, setNotesById] = useState({});
  const [afterPhotoById, setAfterPhotoById] = useState({}); // claimId → { name, data }
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  // Standalone "upload after photo" uploader state for resolved / rejected
  // claims, keyed by claim id.
  const [standalonePhotoById, setStandalonePhotoById] = useState({});
  const [expandedStandaloneId, setExpandedStandaloneId] = useState(null);

  // Per-claim file input refs so we can reset them after submit.
  const afterInputRefs = useRef({});
  const standaloneInputRefs = useRef({});

  async function load() {
    try {
      setClaims(await api('/repair-claims'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function claim(id) {
    try {
      await api(`/repair-claims/${id}`, { method: 'PUT', body: { status: 'in_progress' } });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function pickAfterPhoto(claimId, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SOURCE_BYTES) {
      setError(`${file.name} is too large (max 20 MB source).`);
      e.target.value = '';
      return;
    }
    setError(null);
    try {
      const data = await compressImage(file);
      setAfterPhotoById((prev) => ({
        ...prev,
        [claimId]: { name: renameToJpg(file.name), data },
      }));
    } catch (err) {
      setError('Could not process photo: ' + err.message);
    }
  }

  function clearAfterPhoto(claimId) {
    setAfterPhotoById((prev) => {
      const next = { ...prev };
      delete next[claimId];
      return next;
    });
    const el = afterInputRefs.current[claimId];
    if (el) el.value = '';
  }

  async function resolve(id, status) {
    const afterPhoto = afterPhotoById[id];
    if (status === 'resolved' && !afterPhoto) {
      setError('Upload an "after" photo before marking this claim resolved.');
      return;
    }
    try {
      await api(`/repair-claims/${id}`, {
        method: 'PUT',
        body: {
          status,
          resolution_notes: notesById[id] || null,
          after_photo: afterPhoto || null,
        },
      });
      setNotesById({ ...notesById, [id]: '' });
      clearAfterPhoto(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openPhoto(claimId, kind) {
    try {
      const photo = await api(`/repair-claims/${claimId}/photo/${kind}`);
      setLightbox({ ...photo, kind });
    } catch (err) {
      setError(err.message);
    }
  }

  async function pickStandalonePhoto(claimId, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SOURCE_BYTES) {
      setError(`${file.name} is too large (max 20 MB source).`);
      e.target.value = '';
      return;
    }
    setError(null);
    try {
      const data = await compressImage(file);
      setStandalonePhotoById((prev) => ({
        ...prev,
        [claimId]: { name: renameToJpg(file.name), data },
      }));
    } catch (err) {
      setError('Could not process photo: ' + err.message);
    }
  }

  function clearStandalonePhoto(claimId) {
    setStandalonePhotoById((prev) => {
      const next = { ...prev };
      delete next[claimId];
      return next;
    });
    const el = standaloneInputRefs.current[claimId];
    if (el) el.value = '';
  }

  async function uploadStandalonePhoto(claimId) {
    const staged = standalonePhotoById[claimId];
    if (!staged) {
      setError('Pick a photo first.');
      return;
    }
    try {
      await api(`/repair-claims/${claimId}/after-photo`, {
        method: 'PUT',
        body: { after_photo: staged },
      });
      clearStandalonePhoto(claimId);
      setExpandedStandaloneId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repair claims</h1>
        <p className="text-slate-600">Pick up unassigned claims or work ones assigned to you.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        {claims.map((c) => {
          const stagedAfter = afterPhotoById[c.id];
          return (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{c.equipment_name}</h3>
                    <StatusBadge status={c.status} />
                    <RepairTypeBadge type={c.repair_type} />
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{c.description}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Reported {new Date(c.created_at).toLocaleString()}
                    {c.client_name && ` · by ${c.client_name}`}
                  </p>
                  {c.resolution_notes && (
                    <p className="mt-2 text-sm italic text-slate-700">
                      Resolution: {c.resolution_notes}
                    </p>
                  )}
                  <div className="mt-3 space-x-3">
                    {c.has_before_photo && (
                      <button
                        type="button"
                        onClick={() => openPhoto(c.id, 'before')}
                        className="text-xs text-slate-700 hover:underline"
                      >
                        📷 View problem photo
                      </button>
                    )}
                    {c.has_after_photo && (
                      <button
                        type="button"
                        onClick={() => openPhoto(c.id, 'after')}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        ✅ View repair photo
                      </button>
                    )}
                  </div>
                </div>
                <div className="shrink-0 space-x-2">
                  {!c.mechanic_id && c.status === 'open' && (
                    <button className="btn-primary" onClick={() => claim(c.id)}>
                      Claim
                    </button>
                  )}
                </div>
              </div>

              {c.status !== 'open' && c.status !== 'in_progress' && (
                <div className="mt-4">
                  {expandedStandaloneId === c.id ? (
                    <StandaloneUploader
                      claimId={c.id}
                      hasAfter={!!c.has_after_photo}
                      staged={standalonePhotoById[c.id]}
                      inputRef={(el) => { standaloneInputRefs.current[c.id] = el; }}
                      onPick={(e) => pickStandalonePhoto(c.id, e)}
                      onClear={() => clearStandalonePhoto(c.id)}
                      onUpload={() => uploadStandalonePhoto(c.id)}
                      onCancel={() => setExpandedStandaloneId(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-slate-700 hover:underline"
                      onClick={() => setExpandedStandaloneId(c.id)}
                    >
                      {c.has_after_photo ? 'Replace after photo' : 'Add after photo'}
                    </button>
                  )}
                </div>
              )}

              {(c.status === 'open' || c.status === 'in_progress') && (
                <div className="mt-4 space-y-3">
                  <textarea
                    rows={2}
                    placeholder="Resolution notes (optional)…"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    value={notesById[c.id] || ''}
                    onChange={(e) => setNotesById({ ...notesById, [c.id]: e.target.value })}
                  />

                  <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2 max-w-md">
                    <p className="text-xs font-medium text-slate-600">
                      Photo after repair (required to mark resolved)
                    </p>
                    {stagedAfter?.data ? (
                      <img
                        src={stagedAfter.data}
                        alt={stagedAfter.name}
                        className="h-32 w-full object-cover rounded-md border border-slate-200"
                      />
                    ) : (
                      <div className="h-32 w-full rounded-md border border-dashed border-slate-300
                                      flex items-center justify-center text-xs text-slate-400">
                        no photo yet
                      </div>
                    )}
                    <input
                      ref={(el) => { afterInputRefs.current[c.id] = el; }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => pickAfterPhoto(c.id, e)}
                      className="block w-full text-xs text-slate-600
                                 file:mr-2 file:py-1 file:px-2 file:text-xs
                                 file:rounded file:border-0
                                 file:bg-slate-800 file:text-white
                                 hover:file:bg-slate-700"
                    />
                    {stagedAfter?.name && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate text-slate-700" title={stagedAfter.name}>
                          {stagedAfter.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => clearAfterPhoto(c.id)}
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-x-2">
                    <button className="btn-primary" onClick={() => resolve(c.id, 'resolved')}>
                      Mark resolved
                    </button>
                    <button className="btn-secondary" onClick={() => resolve(c.id, 'rejected')}>
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {claims.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No claims assigned to you yet.
          </div>
        )}
      </div>

      {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function StandaloneUploader({ claimId, hasAfter, staged, inputRef, onPick, onClear, onUpload, onCancel }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2 max-w-md">
      <p className="text-xs font-medium text-slate-600">
        {hasAfter ? 'Replace the after-repair photo' : 'Upload a photo showing the repaired equipment'}
      </p>
      {staged?.data ? (
        <img
          src={staged.data}
          alt={staged.name}
          className="h-32 w-full object-cover rounded-md border border-slate-200"
        />
      ) : (
        <div className="h-32 w-full rounded-md border border-dashed border-slate-300
                        flex items-center justify-center text-xs text-slate-400">
          no photo yet
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="block w-full text-xs text-slate-600
                   file:mr-2 file:py-1 file:px-2 file:text-xs
                   file:rounded file:border-0
                   file:bg-slate-800 file:text-white
                   hover:file:bg-slate-700"
      />
      {staged?.name && (
        <div className="flex items-center justify-between text-xs">
          <span className="truncate text-slate-700" title={staged.name}>{staged.name}</span>
          <button type="button" onClick={onClear} className="text-red-600 hover:underline">
            Remove
          </button>
        </div>
      )}
      <div className="space-x-2">
        <button type="button" className="btn-primary" disabled={!staged} onClick={onUpload}>
          {hasAfter ? 'Replace after photo' : 'Upload after photo'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function RepairTypeBadge({ type }) {
  if (type === 'road') {
    return <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">🚨 Road</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">🔧 AG</span>;
}

function Lightbox({ photo, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-white text-sm mb-2">
          <span>{photo.name || (photo.kind === 'after' ? 'After repair' : 'Problem photo')}</span>
          <div className="space-x-3">
            <a
              href={photo.data}
              download={photo.name || `${photo.kind}-photo.jpg`}
              className="hover:underline"
            >
              Download
            </a>
            <button type="button" onClick={onClose} className="hover:underline">Close</button>
          </div>
        </div>
        <img
          src={photo.data}
          alt={photo.name || photo.kind}
          className="max-h-[80vh] w-auto mx-auto rounded-md"
        />
      </div>
    </div>
  );
}
