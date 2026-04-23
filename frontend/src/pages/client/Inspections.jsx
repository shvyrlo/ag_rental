import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { compressImage, renameToJpg, MAX_SOURCE_BYTES } from '../../lib/imageCompress.js';
import StatusBadge from '../../components/StatusBadge.jsx';

// Six-photo upload: one inspection per kind (start / end) per rental.
const SLOTS = [1, 2, 3, 4, 5, 6];
const KINDS = [
  { value: 'start', label: 'Start of rental' },
  { value: 'end',   label: 'End of rental' },
];

function emptyPhotos() {
  return SLOTS.map(() => ({ name: '', data: '' }));
}

export default function ClientInspections() {
  const [inspections, setInspections] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [rentalId, setRentalId] = useState('');
  const [kind, setKind] = useState('start');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState(emptyPhotos);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);

  const inputRefs = useRef(SLOTS.map(() => null));

  async function load() {
    try {
      const [i, r] = await Promise.all([
        api('/inspections'),
        api('/rentals'),
      ]);
      setInspections(i);
      setRentals(r);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  const rental = useMemo(
    () => rentals.find((r) => String(r.id) === String(rentalId)) || null,
    [rentals, rentalId],
  );

  // Existing inspections for the selected rental, grouped by kind.
  const existingForRental = useMemo(() => {
    if (!rental) return { start: null, end: null };
    const result = { start: null, end: null };
    for (const i of inspections) {
      if (String(i.rental_id) !== String(rental.id)) continue;
      if (i.kind === 'start' && !result.start) result.start = i;
      if (i.kind === 'end' && !result.end) result.end = i;
    }
    return result;
  }, [inspections, rental]);

  const alreadySubmitted = existingForRental[kind];

  function resetForm() {
    setPhotos(emptyPhotos());
    setNotes('');
    inputRefs.current.forEach((el) => { if (el) el.value = ''; });
  }

  async function pickPhoto(idx, event) {
    const el = event?.target;
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
      const renamed = renameToJpg(file.name);
      setPhotos((prev) => {
        const next = [...prev];
        next[idx] = { name: renamed, data };
        return next;
      });
    } catch (err) {
      setError('Could not process photo: ' + err.message);
    }
    // Let the user pick the same file again (e.g. to retry after a camera shot)
    if (el) el.value = '';
  }

  function clearPhoto(idx) {
    setPhotos((prev) => {
      const next = [...prev];
      next[idx] = { name: '', data: '' };
      return next;
    });
    const el = inputRefs.current[idx];
    if (el) el.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!rental) {
      setError('Pick one of your rentals.');
      return;
    }
    const filled = photos.filter((p) => p.data).length;
    if (filled !== 6) {
      setError(`Please upload all 6 photos (${filled}/6 uploaded).`);
      return;
    }
    if (alreadySubmitted) {
      setError(`You already submitted a ${kind}-rental inspection for this rental.`);
      return;
    }

    setBusy(true);
    try {
      await api('/inspections', {
        method: 'POST',
        body: {
          rental_id: rental.id,
          equipment_id: rental.equipment_id,
          kind,
          notes,
          photos,
        },
      });
      setSuccess(`${kind === 'start' ? 'Start' : 'End'}-of-rental inspection submitted.`);
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Inspections</h1>
        <p className="text-slate-600">
          For every rental you submit two inspections — one at the start and one at the
          end — each with six photos of the equipment.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Submit inspection</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>Rental</label>
              <select
                required
                value={rentalId}
                onChange={(e) => setRentalId(e.target.value)}
              >
                <option value="">Select…</option>
                {rentals.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} — {r.equipment_unit_number
                      ? `[${r.equipment_unit_number}] `
                      : ''}{r.equipment_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Inspection kind</label>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>
          </div>

          {rental && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 flex flex-wrap gap-x-6 gap-y-1">
              <span>Status: <StatusBadge status={rental.status} /></span>
              <span>Start: {existingForRental.start
                ? <span className="text-emerald-700">submitted</span>
                : <span className="text-slate-500">not yet</span>}</span>
              <span>End: {existingForRental.end
                ? <span className="text-emerald-700">submitted</span>
                : <span className="text-slate-500">not yet</span>}</span>
            </div>
          )}

          {alreadySubmitted && (
            <p className="text-sm text-accent-800 bg-accent-50 border border-accent-200 rounded-md px-3 py-2">
              You've already submitted a {kind === 'start' ? 'start' : 'end'}-of-rental
              inspection for this rental. Switch the kind above or pick a different rental.
            </p>
          )}

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Equipment photos (6 required). Photos are automatically resized to
              1600 px and re-encoded as JPEG before upload.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SLOTS.map((slot, idx) => (
                <PhotoSlot
                  key={slot}
                  label={`Photo ${slot}`}
                  photo={photos[idx]}
                  inputRef={(el) => { inputRefs.current[idx] = el; }}
                  onChange={(e) => pickPhoto(idx, e)}
                  onClear={() => clearPhoto(idx)}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condition, damage, fuel level…"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <button className="btn-primary" disabled={busy || alreadySubmitted}>
            {busy ? 'Submitting…' : 'Submit inspection'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Your inspection history</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700 text-left">
              <tr>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Rental</th>
                <th className="px-4 py-2">Equipment</th>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2">Photos</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((i) => (
                <tr key={i.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-2">{new Date(i.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">#{i.rental_id ?? '—'}</td>
                  <td className="px-4 py-2">{i.equipment_name}</td>
                  <td className="px-4 py-2 capitalize">{i.kind || '—'}</td>
                  <td className="px-4 py-2">{i.photo_count ?? 0}/6</td>
                  <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
                </tr>
              ))}
              {inspections.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No inspections yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PhotoSlot({ label, photo, inputRef, onChange, onClear }) {
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);
  // Forward the upload input ref to the parent (used for reset on submit).
  const setUploadRef = (el) => {
    uploadRef.current = el;
    if (typeof inputRef === 'function') inputRef(el);
    else if (inputRef) inputRef.current = el;
  };
  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      {photo?.data ? (
        <img
          src={photo.data}
          alt={photo.name || label}
          className="h-32 w-full object-cover rounded-md border border-slate-200"
        />
      ) : (
        <div className="h-32 w-full rounded-md border border-dashed border-slate-300
                        flex items-center justify-center text-xs text-slate-400">
          no photo
        </div>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
      <input
        ref={setUploadRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex-1 rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
        >
          Take photo
        </button>
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Upload
        </button>
      </div>
      {photo?.name && (
        <div className="flex items-center justify-between text-xs">
          <span className="truncate text-slate-700" title={photo.name}>{photo.name}</span>
          <button type="button" onClick={onClear} className="text-red-600 hover:underline">
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
