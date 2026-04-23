import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { compressImage, renameToJpg, MAX_SOURCE_BYTES } from '../../lib/imageCompress.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useT } from '../../i18n/i18n.jsx';

// Six required angles — each photo slot is labeled so drivers know which
// shot to take next. Clients can add extra slots past these six.
const REQUIRED_ANGLES = [
  { key: 'front',  label: 'Front' },
  { key: 'left',   label: 'Left side' },
  { key: 'right',  label: 'Right side' },
  { key: 'back',   label: 'Back' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'top',    label: 'Top' },
];
const MIN_PHOTOS = REQUIRED_ANGLES.length;

const KINDS = [
  { value: 'start', label: 'Start of rental' },
  { value: 'end',   label: 'End of rental' },
];

// Substitute {n} placeholder values inside a translated string.
function fmt(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (values?.[k] ?? `{${k}}`));
}

function emptyPhotos() {
  return REQUIRED_ANGLES.map((a) => ({
    name: '',
    data: '',
    label: a.label,
    key: a.key,
    extra: false,
  }));
}

export default function ClientInspections() {
  const t = useT();
  const [inspections, setInspections] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [rentalId, setRentalId] = useState('');
  const [kind, setKind] = useState('start');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState(emptyPhotos);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null); // for viewing full-size

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

  const current = photos[currentIdx] || photos[0];
  const requiredFilled = photos
    .slice(0, MIN_PHOTOS)
    .filter((p) => p.data).length;
  const allRequiredDone = requiredFilled >= MIN_PHOTOS;

  function resetForm() {
    setPhotos(emptyPhotos());
    setNotes('');
    setCurrentIdx(0);
  }

  // Finds the next slot that still needs a photo. Prefers going forward from
  // `from+1`, then wraps to the start so the user is always pushed toward
  // whatever's missing.
  function nextEmptyIndex(arr, from) {
    for (let i = from + 1; i < arr.length; i++) if (!arr[i].data) return i;
    for (let i = 0; i < arr.length; i++) if (!arr[i].data) return i;
    return from; // everything full
  }

  async function capturePhoto(event) {
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
        next[currentIdx] = { ...next[currentIdx], name: renamed, data };
        // Auto-advance to the next slot that still needs a photo.
        const jump = nextEmptyIndex(next, currentIdx);
        // Schedule the advance after this state update commits.
        queueMicrotask(() => setCurrentIdx(jump));
        return next;
      });
    } catch (err) {
      setError('Could not process photo: ' + err.message);
    }
    // Let the user pick the same file again (e.g. to retry after a camera shot)
    if (el) el.value = '';
  }

  function addPhotoSlot() {
    setPhotos((prev) => {
      const idx = prev.length;
      const extraNum = idx - MIN_PHOTOS + 1;
      const next = [...prev, {
        name: '',
        data: '',
        label: `Extra ${extraNum}`,
        key: `extra-${idx}`,
        extra: true,
      }];
      queueMicrotask(() => setCurrentIdx(next.length - 1));
      return next;
    });
  }

  function removePhotoSlot(idx) {
    setPhotos((prev) => {
      if (idx < MIN_PHOTOS || idx >= prev.length) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
    setCurrentIdx((c) => {
      if (c === idx) return Math.max(0, idx - 1);
      if (c > idx) return c - 1;
      return c;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!rental) {
      setError(t('Pick one of your rentals.'));
      return;
    }
    if (requiredFilled < MIN_PHOTOS) {
      setError(fmt(
        t('Please take all {n} photos ({filled}/{n} taken).'),
        { n: MIN_PHOTOS, filled: requiredFilled },
      ));
      return;
    }
    if (alreadySubmitted) {
      setError(
        kind === 'start'
          ? t('You already submitted a start-of-rental inspection for this rental.')
          : t('You already submitted an end-of-rental inspection for this rental.')
      );
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
          photos: photos
            .filter((p) => p.data)
            .map((p) => ({ name: p.name, data: p.data })),
        },
      });
      setSuccess(kind === 'start'
        ? t('Start-of-rental inspection submitted.')
        : t('End-of-rental inspection submitted.'));
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
        <h1 className="text-2xl font-bold">{t('Inspections')}</h1>
        <p className="text-slate-600">
          {t('For every rental you submit two inspections — one at the start and one at the end — each with six photos of the equipment.')}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">{t('Submit inspection')}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>{t('Rental')}</label>
              <select
                required
                value={rentalId}
                onChange={(e) => setRentalId(e.target.value)}
              >
                <option value="">{t('Select…')}</option>
                {rentals.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} — {r.equipment_unit_number
                      ? `[${r.equipment_unit_number}] `
                      : ''}{t(r.equipment_name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t('Inspection kind')}</label>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{t(k.label)}</option>
                ))}
              </select>
            </div>
          </div>

          {rental && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 flex flex-wrap gap-x-6 gap-y-1">
              <span>{t('Status')}: <StatusBadge status={rental.status} /></span>
              <span>{t('Start')}: {existingForRental.start
                ? <span className="text-emerald-700">{t('submitted')}</span>
                : <span className="text-slate-500">{t('not yet')}</span>}</span>
              <span>{t('End')}: {existingForRental.end
                ? <span className="text-emerald-700">{t('submitted')}</span>
                : <span className="text-slate-500">{t('not yet')}</span>}</span>
            </div>
          )}

          {alreadySubmitted && (
            <p className="text-sm text-accent-800 bg-accent-50 border border-accent-200 rounded-md px-3 py-2">
              {kind === 'start'
                ? t('You\'ve already submitted a start-of-rental inspection for this rental. Switch the kind above or pick a different rental.')
                : t('You\'ve already submitted an end-of-rental inspection for this rental. Switch the kind above or pick a different rental.')}
            </p>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">
                {t('Equipment photos')}
              </p>
              <p className="text-sm text-slate-500">
                {fmt(t('{filled}/{n} taken'), { n: MIN_PHOTOS, filled: requiredFilled })}
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {t('Photos must be taken with the camera — they\'re automatically resized to 1600 px and re-encoded as JPEG before upload.')}
            </p>

            {/* Big active-capture card */}
            <ActiveCaptureCard
              photo={current}
              index={currentIdx}
              totalRequired={MIN_PHOTOS}
              onCapture={capturePhoto}
              onView={() => setLightboxIdx(currentIdx)}
            />

            {/* Thumbnails row: click any to jump back / retake */}
            <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {photos.map((p, idx) => (
                <Thumbnail
                  key={p.key + ':' + idx}
                  photo={p}
                  slotNumber={idx + 1}
                  active={idx === currentIdx}
                  onSelect={() => setCurrentIdx(idx)}
                  onRemove={p.extra ? () => removePhotoSlot(idx) : null}
                  onView={() => setLightboxIdx(idx)}
                />
              ))}
            </div>

            {allRequiredDone && (
              <button
                type="button"
                onClick={addPhotoSlot}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50/50 transition"
              >
                <span className="text-lg leading-none">+</span>
                {t('Add extra photo')}
              </button>
            )}
          </div>

          <div className="field">
            <label>{t('Notes (optional)')}</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('Condition, damage, fuel level…')}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <button className="btn-primary" disabled={busy || alreadySubmitted}>
            {busy ? t('Submitting…') : t('Submit inspection')}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">{t('Your inspection history')}</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700 text-left">
              <tr>
                <th className="px-4 py-2">{t('Submitted')}</th>
                <th className="px-4 py-2">{t('Rental')}</th>
                <th className="px-4 py-2">{t('Equipment')}</th>
                <th className="px-4 py-2">{t('Kind')}</th>
                <th className="px-4 py-2">{t('Photos')}</th>
                <th className="px-4 py-2">{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((i) => (
                <tr key={i.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-2">{new Date(i.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">#{i.rental_id ?? '—'}</td>
                  <td className="px-4 py-2">{t(i.equipment_name)}</td>
                  <td className="px-4 py-2 capitalize">{i.kind ? t(i.kind) : '—'}</td>
                  <td className="px-4 py-2">{i.photo_count ?? 0}/6</td>
                  <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
                </tr>
              ))}
              {inspections.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>{t('No inspections yet.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Full-size preview of a captured photo */}
      {lightboxIdx !== null && photos[lightboxIdx]?.data && (
        <PhotoLightbox
          photo={photos[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}

// ─── Active capture card ────────────────────────────────────────────
// Big one-at-a-time shot: labels the angle, shows the preview if one was
// captured, triggers the rear camera on tap.
function ActiveCaptureCard({ photo, index, totalRequired, onCapture, onView }) {
  const t = useT();
  const cameraRef = useRef(null);
  const isExtra = !!photo?.extra;
  const slotNum = index + 1;
  const angleLabel = photo?.extra
    ? fmt(t('Extra {n}'), { n: slotNum - totalRequired })
    : t(photo?.label || '');
  const header = isExtra
    ? fmt(t('Extra photo {n}'), { n: slotNum - totalRequired })
    : fmt(t('Photo {cur} of {total} — {angle}'), {
        cur: slotNum,
        total: totalRequired,
        angle: angleLabel,
      });

  return (
    <div className="rounded-xl border-2 border-brand-300 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between bg-brand-50 px-4 py-2 border-b border-brand-200">
        <p className="text-sm font-semibold text-brand-800">{header}</p>
      </div>
      <div className="p-4">
        {photo?.data ? (
          <button
            type="button"
            onClick={onView}
            className="block w-full"
            title={t('Tap to view full size')}
          >
            <img
              src={photo.data}
              alt={photo.name || angleLabel}
              className="w-full max-h-[420px] object-contain bg-slate-50 rounded-md border border-slate-200"
            />
          </button>
        ) : (
          <div className="w-full h-[260px] sm:h-[340px] rounded-md border-2 border-dashed border-slate-300
                          bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-500">
            <svg aria-hidden className="h-12 w-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.822 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <p className="text-base font-medium text-slate-700">
              {fmt(t('Take a photo of the {angle}'), {
                angle: (angleLabel || '').toLowerCase(),
              })}
            </p>
          </div>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onCapture}
          className="hidden"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex-1 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {photo?.data ? t('Retake photo') : t('Take photo')}
          </button>
          {photo?.data && (
            <button
              type="button"
              onClick={onView}
              className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('View')}
            </button>
          )}
        </div>
        {photo?.name && (
          <p className="mt-2 text-xs text-slate-500 truncate" title={photo.name}>
            {photo.name}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Thumbnail tile ────────────────────────────────────────────────
// One per slot. Click to make it the active card; click the × (extras
// only) to remove. A dot in the corner shows the active slot.
function Thumbnail({ photo, slotNumber, active, onSelect, onRemove, onView }) {
  const t = useT();
  const angleLabel = photo.extra
    ? fmt(t('Extra {n}'), { n: slotNumber - MIN_PHOTOS })
    : t(photo.label || '');
  return (
    <div
      className={
        'relative rounded-lg border text-left transition overflow-hidden ' +
        (active
          ? 'border-brand-500 ring-2 ring-brand-200 bg-white'
          : 'border-slate-200 bg-white hover:border-brand-300')
      }
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full focus:outline-none"
        title={angleLabel}
      >
        <div className="relative h-20 w-full bg-slate-50 flex items-center justify-center">
          {photo.data ? (
            <img
              src={photo.data}
              alt={angleLabel}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              {slotNumber}
            </span>
          )}
          {photo.data && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center
                             h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">
              ✓
            </span>
          )}
        </div>
        <div className="px-2 py-1 text-[11px] font-medium text-slate-700 truncate">
          {slotNumber}. {angleLabel}
        </div>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title={t('Remove this extra slot')}
          className="absolute top-0.5 left-0.5 rounded-full bg-white/90 text-slate-500 hover:text-red-600 text-xs leading-none px-1.5 py-0.5 shadow"
        >
          ×
        </button>
      )}
      {photo.data && (
        <button
          type="button"
          onClick={onView}
          title={t('View full size')}
          className="absolute bottom-1 right-1 rounded-full bg-black/60 text-white text-[10px] px-1.5 py-0.5 hover:bg-black/80"
        >
          ⤢
        </button>
      )}
    </div>
  );
}

// ─── Lightbox ──────────────────────────────────────────────────────
// Full-size preview so drivers can actually verify what they captured.
function PhotoLightbox({ photo, onClose }) {
  const t = useT();
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
          <span className="truncate">
            {photo.extra ? photo.name : `${t(photo.label || '')} · ${photo.name}`}
          </span>
          <div className="space-x-3">
            <a
              href={photo.data}
              download={photo.name || 'photo.jpg'}
              className="hover:underline"
            >
              {t('Download')}
            </a>
            <button type="button" onClick={onClose} className="hover:underline">
              {t('Close')}
            </button>
          </div>
        </div>
        <img
          src={photo.data}
          alt={photo.name || photo.label}
          className="max-h-[80vh] w-auto mx-auto rounded-md"
        />
      </div>
    </div>
  );
}
