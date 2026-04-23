import { Fragment, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { compressImage, renameToJpg, MAX_SOURCE_BYTES } from '../../lib/imageCompress.js';
import StatusBadge from '../../components/StatusBadge.jsx';

// Two ways a client can open a claim:
//   'road' → stuck on the road, needs a roadside fix
//   'ag'   → bring it to AG Rental for shop repair
const REPAIR_TYPES = [
  {
    value: 'road',
    label: 'Road repair',
    description: 'Equipment is stuck on the road. Send a mechanic to me.',
    icon: '🚨',
  },
  {
    value: 'ag',
    label: 'AG repair',
    description: 'Bring equipment to AG Rental shop for repair.',
    icon: '🔧',
  },
];

const EMPTY_FORM = {
  rental_id: '',
  repair_type: 'ag',
  description: '',
  before_photo: null, // { name, data }
};

export default function ClientRepairClaims() {
  const [claims, setClaims] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  // Per-row after-photo staging, keyed by claim id.
  const [afterPhotoById, setAfterPhotoById] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const fileRef = useRef(null);
  const beforeCameraRef = useRef(null);
  const afterInputRefs = useRef({});
  const afterCameraRefs = useRef({});

  async function load() {
    try {
      const [c, r] = await Promise.all([
        api('/repair-claims'),
        api('/rentals'),
      ]);
      setClaims(c);
      setRentals(r);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function pickBeforePhoto(e) {
    const el = e?.target;
    const file = el?.files?.[0];
    if (!file) return;
    if (file.size > MAX_SOURCE_BYTES) {
      setError(`${file.name} is too large (max 20 MB source).`);
      if (el) el.value = '';
      return;
    }
    setError(null);
    try {
      const data = await compressImage(file);
      setForm((f) => ({
        ...f,
        before_photo: { name: renameToJpg(file.name), data },
      }));
    } catch (err) {
      setError('Could not process photo: ' + err.message);
    }
    if (el) el.value = '';
  }

  function clearBeforePhoto() {
    setForm((f) => ({ ...f, before_photo: null }));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const rental = rentals.find(r => String(r.id) === String(form.rental_id));
      if (!rental) throw new Error('Pick one of your rentals');
      if (!form.before_photo) throw new Error('A photo of the problem is required');
      await api('/repair-claims', {
        method: 'POST',
        body: {
          equipment_id: rental.equipment_id,
          repair_type: form.repair_type,
          description: form.description,
          before_photo: form.before_photo,
        },
      });
      setForm(EMPTY_FORM);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openClaimPhoto(claimId, kind) {
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
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Repair claims</h1>
        <p className="text-slate-600">Report a problem with equipment you rented.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">File a claim</h2>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="field">
            <label>Rental</label>
            <select
              required
              value={form.rental_id}
              onChange={(e) => setForm({ ...form, rental_id: e.target.value })}
            >
              <option value="">Select…</option>
              {rentals.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.equipment_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Repair type</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {REPAIR_TYPES.map((t) => {
                const active = form.repair_type === t.value;
                return (
                  <label
                    key={t.value}
                    className={
                      'rounded-lg border p-4 cursor-pointer flex gap-3 items-start transition ' +
                      (active
                        ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300')
                    }
                  >
                    <input
                      type="radio"
                      name="repair_type"
                      className="mt-1"
                      value={t.value}
                      checked={active}
                      onChange={() => setForm({ ...form, repair_type: t.value })}
                    />
                    <div>
                      <div className="font-medium text-slate-900">
                        <span className="mr-1">{t.icon}</span>{t.label}
                      </div>
                      <div className="text-sm text-slate-600">{t.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label>What's wrong?</label>
            <textarea
              rows={4}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Photo of the problem (required)
            </p>
            <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2 max-w-md">
              {form.before_photo?.data ? (
                <img
                  src={form.before_photo.data}
                  alt={form.before_photo.name}
                  className="h-40 w-full object-cover rounded-md border border-slate-200"
                />
              ) : (
                <div className="h-40 w-full rounded-md border border-dashed border-slate-300
                                flex items-center justify-center text-xs text-slate-400">
                  no photo yet
                </div>
              )}
              <input
                ref={beforeCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={pickBeforePhoto}
                className="hidden"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={pickBeforePhoto}
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => beforeCameraRef.current?.click()}
                  className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Take photo
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Upload
                </button>
              </div>
              {form.before_photo?.name && (
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-700" title={form.before_photo.name}>
                    {form.before_photo.name}
                  </span>
                  <button type="button" onClick={clearBeforePhoto} className="text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button className="btn-primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit claim'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Your claims</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700 text-left">
              <tr>
                <th className="px-4 py-2">Equipment</th>
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
                      <td className="px-4 py-2">
                        <RepairTypeBadge type={c.repair_type} />
                      </td>
                      <td className="px-4 py-2 text-slate-600">{c.description}</td>
                      <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                        {c.has_before_photo ? (
                          <button
                            type="button"
                            className="text-xs text-slate-700 hover:underline"
                            onClick={() => openClaimPhoto(c.id, 'before')}
                          >
                            📷 Before
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                        {c.has_after_photo ? (
                          <button
                            type="button"
                            className="text-xs text-emerald-700 hover:underline"
                            onClick={() => openClaimPhoto(c.id, 'after')}
                          >
                            ✅ After
                          </button>
                        ) : null}
                      </td>
                      <td className="px-4 py-2">{c.mechanic_name || 'Unassigned'}</td>
                      <td className="px-4 py-2"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-2 text-right">
                        {c.status !== 'rejected' && (
                          <button
                            type="button"
                            className="text-xs text-slate-700 hover:underline"
                            onClick={() => setExpandedId(isOpen ? null : c.id)}
                          >
                            {isOpen
                              ? 'Close'
                              : (c.has_after_photo ? 'Replace after photo' : 'Add after photo')}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && c.status !== 'rejected' && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={7} className="px-4 py-4">
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
                              ref={(el) => { afterCameraRefs.current[c.id] = el; }}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => pickAfterPhoto(c.id, e)}
                              className="hidden"
                            />
                            <input
                              ref={(el) => { afterInputRefs.current[c.id] = el; }}
                              type="file"
                              accept="image/*"
                              onChange={(e) => pickAfterPhoto(c.id, e)}
                              className="hidden"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => afterCameraRefs.current[c.id]?.click()}
                                className="flex-1 rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                              >
                                Take photo
                              </button>
                              <button
                                type="button"
                                onClick={() => afterInputRefs.current[c.id]?.click()}
                                className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Upload
                              </button>
                            </div>
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
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No claims filed.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
