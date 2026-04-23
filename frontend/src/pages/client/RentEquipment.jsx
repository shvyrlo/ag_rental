import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

// Stock images we can match an equipment row against by keyword.
// Equipment rows don't carry an image URL in the DB (yet), so we infer the
// best match from the name/category. Anything unmatched falls back to
// `defaultImg` so the gallery never shows a broken card.
import stepDeckImg from '../../assets/trailers/step-deck.png';
import conestogaImg from '../../assets/trailers/conestoga.png';
import flatbedImg from '../../assets/trailers/flatbed.png';
import reeferImg from '../../assets/trailers/reefer.png';
import peterbiltImg from '../../assets/trucks/peterbilt-579.png';
import cascadiaImg from '../../assets/trucks/freightliner-cascadia.png';

// Match order matters — most specific keywords first.
const IMAGE_MATCHERS = [
  { keys: ['step deck', 'step-deck', 'stepdeck', 'drop deck'], img: stepDeckImg },
  { keys: ['conestoga', 'curtain'], img: conestogaImg },
  { keys: ['reefer', 'refriger'], img: reeferImg },
  { keys: ['flatbed', 'flat bed'], img: flatbedImg },
  { keys: ['peterbilt', '579'], img: peterbiltImg },
  { keys: ['freightliner', 'cascadia'], img: cascadiaImg },
];

const defaultImg = flatbedImg; // safe visual fallback

function pickImage(eq) {
  const hay = `${eq.name || ''} ${eq.category || ''}`.toLowerCase();
  for (const m of IMAGE_MATCHERS) {
    if (m.keys.some((k) => hay.includes(k))) return m.img;
  }
  return defaultImg;
}

export default function RentEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [eq, r] = await Promise.all([
        api('/equipment'),
        api('/rentals'),
      ]);
      setEquipment(eq);
      setRentals(r);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  const available = useMemo(
    () => equipment.filter((e) => e.status === 'available'),
    [equipment],
  );

  const selected = useMemo(
    () => available.find((e) => e.id === selectedId) || null,
    [available, selectedId],
  );

  async function handleRent(e) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError('Pick an equipment above.');
      return;
    }
    setBusy(true);
    try {
      await api('/rentals', {
        method: 'POST',
        body: {
          equipment_id: selected.id,
          start_date: startDate,
          end_date: endDate,
        },
      });
      setSelectedId(null);
      setStartDate('');
      setEndDate('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Rent equipment</h1>
        <p className="text-slate-600">Pick a unit from the fleet below, then choose your dates.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Available fleet</h2>
        {available.length === 0 ? (
          <p className="text-sm text-slate-500">No equipment is available right now.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((eq) => {
              const isSelected = selectedId === eq.id;
              return (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : eq.id)}
                  className={
                    'group text-left rounded-xl border bg-white overflow-hidden transition ' +
                    'hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ' +
                    (isSelected
                      ? 'border-brand-600 ring-2 ring-brand-500 shadow-md'
                      : 'border-slate-200')
                  }
                >
                  <div className="aspect-[16/10] bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={pickImage(eq)}
                      alt={eq.name}
                      className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{eq.name}</p>
                        {eq.unit_number && (
                          <p className="text-xs font-mono text-slate-500">Unit {eq.unit_number}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                        ${Number(eq.monthly_rate).toFixed(0)}
                        <span className="text-xs font-normal text-slate-500">/mo</span>
                      </p>
                    </div>
                    {eq.description && (
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2">{eq.description}</p>
                    )}
                    <p className={
                      'mt-3 text-xs font-medium ' +
                      (isSelected ? 'text-brand-700' : 'text-slate-500')
                    }>
                      {isSelected ? 'Selected — pick dates below' : 'Click to select'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <img
              src={pickImage(selected)}
              alt=""
              className="w-24 h-16 object-contain bg-slate-50 rounded-md border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500">Booking</p>
              <p className="font-semibold text-slate-900 truncate">{selected.name}</p>
              <p className="text-sm text-slate-600">
                ${Number(selected.monthly_rate).toFixed(2)}/month
                {selected.unit_number ? ` · Unit ${selected.unit_number}` : ''}
              </p>
            </div>
          </div>

          <form onSubmit={handleRent} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>Start date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label>End date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <button className="btn-primary" disabled={busy}>
                {busy ? 'Booking…' : 'Book rental'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setSelectedId(null); setStartDate(''); setEndDate(''); setError(null); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {error && !selected && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">Your rentals</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700 text-left">
              <tr>
                <th className="px-4 py-2">Unit #</th>
                <th className="px-4 py-2">Equipment</th>
                <th className="px-4 py-2">Dates</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-4 py-2 font-mono text-slate-700">{r.equipment_unit_number || '—'}</td>
                  <td className="px-4 py-2">{r.equipment_name}</td>
                  <td className="px-4 py-2">
                    {new Date(r.start_date).toLocaleDateString()} –{' '}
                    {new Date(r.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">${Number(r.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {rentals.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No rentals yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
