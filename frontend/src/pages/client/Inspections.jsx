import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { compressImage, renameToJpg, MAX_SOURCE_BYTES } from '../../lib/imageCompress.js';
import StatusBadge from '../../components/StatusBadge.jsx';

// Six-photo minimum per inspection (one per kind/rental). Clients can
// add more slots past that if they need extra angles.
const MIN_PHOTOS = 6;
const KINDS = [
  { value: 'start', label: 'Start of rental' },
  { value: 'end',   label: 'End of rental' },
];

function emptyPhotos() {
  return Array.from({ length: MIN_PHOTOS }, () => ({ name: '', data: '' }));
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
  }

  function addPhotoSlot() {
    setPhotos((prev) => [...prev, { name: '', data: '' }]);
  }

  function removePhotoSlot(idx) {
    // Only allow removing extra slots beyond the required minimum.
    setPhotos((prev) => {
      if (idx < MIN_PHOTOS || idx >= prev.length) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
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
    if (filled < MIN_PHOTOS) {
      setError(`Please take all ${MIN_PHOTOS} photos (${filled}/${MIN_PHOTOS} taken).`);
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
          // Drop any empty extra slots — backend only wants real photos.
          photos: photos.filter((p) => p.data),
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
              Equipment photos ({MIN_PHOTOS} required). Photos must be taken with the
              camera — they're automatically resized to 1600 px and re-encoded
              as JPEG before upload.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p, idx) => (
                <PhotoSlot
                  key={idx}
                  label={`Photo ${idx + 1}`}
                  photo={p}
                  isExtra={idx >= MIN_PHOTOS}
                  onChange={(e) => pickPhoto(idx, e)}
                  onClear={() => clearPhoto(idx)}
                  onRemoveSlot={() => removePhotoSlot(idx)}
                />
              ))}
              <button
                type="button"
                onClick={addPhotoSlot}
                className="rounded-lg border-2 border-dashed border-slate-300 p-3
                           flex flex-col items-center justify-center gap-2 min-h-[220px]
                           text-slate-500 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50/50
                           transition"
              >
                <span className="text-3xl leading-none">+</span>
                <span className="text-sm font-medium">Add photo</span>
                <span className="text-xs text-slate-400">if {MIN_PHOTOS} isn't enough</span>
              </button>
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

function PhotoSlot({ label, photo, isExtra, onChange, onClear, onRemoveSlot }) {
  const cameraRef = useRef(null);
  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        {isExtra && (
          <button
            type="button"
            onClick={onRemoveSlot}
            title="Remove this extra slot"
            className="text-xs text-slate-400 hover:text-red-600 leading-none px-1"
          >
            ×
          </button>
        )}
      </div>
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
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="w-full rounded-md bg-slate-800 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
      >
        {photo?.data ? 'Retake photo' : 'Take photo'}
      </button>
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
