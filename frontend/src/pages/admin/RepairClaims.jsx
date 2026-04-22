import { Fragment, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { compressImage, renameToJpg, MAX_SOURCE_BYTES } from '../../lib/imageCompress.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function AdminRepairClaims() {
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [afterPhotoById, setAfterPhotoById] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const afterInputRefs = useRef({});

  async function load() {
    try {
      setClaims(await api('/repair-claims'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    try {
      await api(`/repair-claims/${id}`, { method: 'PUT', body: { status } });
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

  async function uploadAfterPhoto(claimId) {
    const staged = afterPhotoById[claimId];
    if (!staged) {
      setError('Pick a photo first.');
      return;
    }
    try {
      await api(`/repair-claims/${claimId}/after-photo`, {
        method: 'PUT',
        body: { after_photo: staged },
      });
      clearAfterPhoto(claimId);
      setExpandedId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repair claims</h1>
        <p className="text-slate-600">Track and resolve every claim.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700 text-left">
            <tr>
              <th className="px-4 py-2">Equipment</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Photos</th>
              <th className="px-4 py-2">Mechanic</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => {
              const isOpen = expandedId === c.id;
              const stagedAfter = afterPhotoById[c.id];
              return (
                <Fragment key={c.id}>
                  <tr className="border-t border-slate-200 align-top">
                    <td className="px-4 py-2">{c.equipment_name}</td>
                    <td className="px-4 py-2">{c.client_name || '—'}</td>
                    <td className="px-4 py-2"><RepairTypeBadge type={c.repair_type} /></td>
                    <td className="px-4 py-2 text-slate-600">{c.description}</td>
                    <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                      {c.has_before_photo ? (
                        <button
                          type="button"
                          className="text-xs text-slate-700 hover:underline"
                          onClick={() => openPhoto(c.id, 'before')}
                        >
                          📷 Before
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                      {c.has_after_photo && (
                        <button
                          type="button"
                          className="text-xs text-emerald-700 hover:underline"
                          onClick={() => openPhoto(c.id, 'after')}
                        >
                          ✅ After
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2">{c.mechanic_name || 'Unassigned'}</td>
                    <td className="px-4 py-2"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-2 text-right space-x-1 whitespace-nowrap">
                      {c.status === 'open' && (
                        <button className="btn-secondary" onClick={() => setStatus(c.id, 'in_progress')}>
                          Start
                        </button>
                      )}
                      {c.status !== 'resolved' && (
                        <button className="btn-primary" onClick={() => setStatus(c.id, 'resolved')}>
                          Resolve
                        </button>
                      )}
                      {c.status !== 'rejected' && c.status !== 'resolved' && (
                        <button className="btn-danger" onClick={() => setStatus(c.id, 'rejected')}>
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-slate-700 hover:underline"
                        onClick={() => setExpandedId(isOpen ? null : c.id)}
                      >
                        {isOpen
                          ? 'Close'
                          : (c.has_after_photo ? 'Replace after photo' : 'Add after photo')}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-slate-100 bg-slate-50/60">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col gap-2 max-w-md">
                          <p className="text-xs font-medium text-slate-600">
                            Upload a photo showing the repaired equipment
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
                          <div>
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={!stagedAfter}
                              onClick={() => uploadAfterPhoto(c.id)}
                            >
                              {c.has_after_photo ? 'Replace after photo' : 'Upload after photo'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {claims.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>No claims.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
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
