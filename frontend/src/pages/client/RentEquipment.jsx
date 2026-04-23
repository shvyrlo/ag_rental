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
// Each entry also defines the "type bucket" we group units under.
const TYPE_MATCHERS = [
  { key: 'step-deck', label: 'Step deck trailer', keys: ['step deck', 'step-deck', 'stepdeck', 'drop deck'], img: stepDeckImg },
  { key: 'conestoga', label: 'Conestoga trailer', keys: ['conestoga', 'curtain'], img: conestogaImg },
  { key: 'reefer', label: 'Reefer trailer', keys: ['reefer', 'refriger'], img: reeferImg },
  { key: 'flatbed', label: 'Flatbed trailer', keys: ['flatbed', 'flat bed'], img: flatbedImg },
  { key: 'peterbilt', label: 'Peterbilt 579', keys: ['peterbilt', '579'], img: peterbiltImg },
  { key: 'cascadia', label: 'Freightliner Cascadia', keys: ['freightliner', 'cascadia'], img: cascadiaImg },
];

const defaultImg = flatbedImg; // safe visual fallback

function pickType(eq) {
  const hay = `${eq.name || ''} ${eq.category || ''}`.toLowerCase();
  for (const m of TYPE_MATCHERS) {
    if (m.keys.some((k) => hay.includes(k))) return m;
  }
  return null;
}

function pickImage(eq) {
  return pickType(eq)?.img || defaultImg;
}

export default function RentEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [expandedTypeKey, setExpandedTypeKey] = useState(null);
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

  // Group available units by inferred type. Preserves TYPE_MATCHERS order so
  // the stacked cards always render in a consistent sequence, with "Other"
  // appended at the end for anything we can't classify.
  const typeGroups = useMemo(() => {
    const buckets = new Map();
    for (const eq of available) {
      const t = pickType(eq);
      const key = t?.key || `other:${(eq.category || 'Other').toLowerCase()}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label: t?.label || eq.category || 'Other equipment',
          img: t?.img || defaultImg,
          units: [],
        });
      }
      buckets.get(key).units.push(eq);
    }
    const order = new Map(TYPE_MATCHERS.map((m, i) => [m.key, i]));
    return [...buckets.values()].sort((a, b) => {
      const ai = order.has(a.key) ? order.get(a.key) : 999;
      const bi = order.has(b.key) ? order.get(b.key) : 999;
      return ai - bi;
    });
  }, [available]);

  const selected = useMemo(
    () => available.find((e) => e.id === selectedId) || null,
    [available, selectedId],
  );

  async function handleRent(e) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError('Pick a unit above.');
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

  function toggleType(key) {
    setExpandedTypeKey((prev) => (prev === key ? null : key));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Rent equipment</h1>
        <p className="text-slate-600">Pick an equipment type, then choose a unit and dates.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Available fleet</h2>
        {typeGroups.length === 0 ? (
          <p className="text-sm text-slate-500">No equipment is available right now.</p>
        ) : (
          <div className="space-y-4">
            {typeGroups.map((group) => {
              const isOpen = expandedTypeKey === group.key;
              const rates = group.units
                .map((u) => Number(u.monthly_rate))
                .filter((n) => Number.isFinite(n));
              const startingRate = rates.length ? Math.min(...rates) : null;

              return (
                <div
                  key={group.key}
                  className={
                    'rounded-xl border bg-white overflow-hidden transition ' +
                    (isOpen ? 'border-brand-500 shadow-md' : 'border-slate-200')
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleType(group.key)}
                    className="w-full text-left flex items-center gap-4 p-4 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-expanded={isOpen}
                  >
                    <div className="w-40 h-24 shrink-0 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-center overflow-hidden">
                      <img
                        src={group.img}
                        alt={group.label}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{group.label}</p>
                      <p className="text-sm text-slate-600">
                        {group.units.length} {group.units.length === 1 ? 'unit' : 'units'} available
                        {startingRate !== null && (
                          <>
                            {' · '}
                            <span className="text-slate-900 font-medium">
                              from ${startingRate.toFixed(0)}/mo
                            </span>
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-xs font-medium text-brand-700">
                        {isOpen ? 'Click to collapse' : 'Click to see available units'}
                      </p>
                    </div>
                    <svg
                      aria-hidden
                      className={'h-5 w-5 text-slate-400 shrink-0 transition-transform ' + (isOpen ? 'rotate-180' : '')}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-200 bg-slate-50/60">
                      <ul className="divide-y divide-slate-200">
                        {group.units.map((u) => {
                          const isSelected = selectedId === u.id;
                          return (
                            <li key={u.id} className="p-4 flex items-start gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                  <p className="font-semibold text-slate-900">{u.name}</p>
                                  {u.unit_number && (
                                    <span className="text-xs font-mono text-slate-500">Unit {u.unit_number}</span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-slate-700">
                                  ${Number(u.monthly_rate).toFixed(2)}
                                  <span className="text-slate-500">/month</span>
                                </p>
                                {u.description && (
                                  <p className="mt-1 text-xs text-slate-600">{u.description}</p>
                                )}
                                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
                                  {u.category && (
                                    <div><dt className="inline text-slate-500">Category: </dt><dd className="inline">{u.category}</dd></div>
                                  )}
                                  {u.year && (
                                    <div><dt className="inline text-slate-500">Year: </dt><dd className="inline">{u.year}</dd></div>
                                  )}
                                  {u.make && (
                                    <div><dt className="inline text-slate-500">Make: </dt><dd className="inline">{u.make}</dd></div>
                                  )}
                                  {u.model && (
                                    <div><dt className="inline text-slate-500">Model: </dt><dd className="inline">{u.model}</dd></div>
                                  )}
                                  {u.vin && (
                                    <div className="col-span-2 sm:col-span-3">
                                      <dt className="inline text-slate-500">VIN: </dt>
                                      <dd className="inline font-mono">{u.vin}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedId(isSelected ? null : u.id)}
                                className={
                                  'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ' +
                                  (isSelected
                                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100')
                                }
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
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
