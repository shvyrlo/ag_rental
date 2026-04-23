import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useT } from '../../i18n/i18n.jsx';

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
// Each entry also defines the "type bucket" we group units under and whether
// it belongs in the Trucks or Trailers filter tab.
const TYPE_MATCHERS = [
  { key: 'step-deck', label: 'Step deck trailer', kind: 'trailer', keys: ['step deck', 'step-deck', 'stepdeck', 'drop deck'], img: stepDeckImg },
  { key: 'conestoga', label: 'Conestoga trailer', kind: 'trailer', keys: ['conestoga', 'curtain'], img: conestogaImg },
  { key: 'reefer', label: 'Reefer trailer', kind: 'trailer', keys: ['reefer', 'refriger'], img: reeferImg },
  { key: 'flatbed', label: 'Flatbed trailer', kind: 'trailer', keys: ['flatbed', 'flat bed'], img: flatbedImg },
  { key: 'peterbilt', label: 'Peterbilt 579', kind: 'truck', keys: ['peterbilt', '579'], img: peterbiltImg },
  { key: 'cascadia', label: 'Freightliner Cascadia', kind: 'truck', keys: ['freightliner', 'cascadia'], img: cascadiaImg },
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
  const t = useT();
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [kindFilter, setKindFilter] = useState('all'); // 'all' | 'trucks' | 'trailers'
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
      const tm = pickType(eq);
      const key = tm?.key || `other:${(eq.category || 'Other').toLowerCase()}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label: tm?.label || eq.category || 'Other equipment',
          kind: tm?.kind || 'other',
          img: tm?.img || defaultImg,
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

  const visibleGroups = useMemo(() => {
    if (kindFilter === 'trucks') return typeGroups.filter((g) => g.kind === 'truck');
    if (kindFilter === 'trailers') return typeGroups.filter((g) => g.kind === 'trailer');
    return typeGroups;
  }, [typeGroups, kindFilter]);

  const truckCount = useMemo(
    () => typeGroups.filter((g) => g.kind === 'truck').reduce((s, g) => s + g.units.length, 0),
    [typeGroups],
  );
  const trailerCount = useMemo(
    () => typeGroups.filter((g) => g.kind === 'trailer').reduce((s, g) => s + g.units.length, 0),
    [typeGroups],
  );
  const totalCount = truckCount + trailerCount;

  const selected = useMemo(
    () => available.find((e) => e.id === selectedId) || null,
    [available, selectedId],
  );

  async function handleRent(e) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError(t('Pick a unit above.'));
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
        <h1 className="text-2xl font-bold">{t('Rent equipment')}</h1>
        <p className="text-slate-600">{t('Pick an equipment type, then choose a unit and dates.')}</p>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('Available fleet')}</h2>
          <div
            role="tablist"
            aria-label={t('Filter by vehicle kind')}
            className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm"
          >
            {[
              { key: 'all', label: 'All', count: totalCount },
              { key: 'trucks', label: 'Trucks', count: truckCount },
              { key: 'trailers', label: 'Trailers', count: trailerCount },
            ].map((tab) => {
              const active = kindFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setKindFilter(tab.key); setExpandedTypeKey(null); }}
                  className={
                    'px-3 py-1.5 rounded-md font-medium transition ' +
                    (active
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100')
                  }
                >
                  {t(tab.label)}
                  <span className={'ml-1.5 text-xs ' + (active ? 'text-white/80' : 'text-slate-400')}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {visibleGroups.length === 0 ? (
          <p className="text-sm text-slate-500">
            {typeGroups.length === 0
              ? t('No equipment is available right now.')
              : (kindFilter === 'trucks'
                  ? t('No trucks are available right now.')
                  : t('No trailers are available right now.'))}
          </p>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => {
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
                    className="w-full text-left flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 p-4 sm:p-6 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-expanded={isOpen}
                  >
                    <div className="w-full h-52 sm:w-[26rem] sm:h-64 shrink-0 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-center overflow-hidden">
                      <img
                        src={group.img}
                        alt={t(group.label)}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xl sm:text-2xl text-slate-900 truncate">{t(group.label)}</p>
                      <p className="mt-1 text-base text-slate-600">
                        {group.units.length}{' '}
                        {group.units.length === 1 ? t('unit') : t('units')}{' '}
                        {t('available')}
                        {startingRate !== null && (
                          <>
                            {' · '}
                            <span className="text-slate-900 font-medium">
                              {t('from')} ${startingRate.toFixed(0)}/{t('mo')}
                            </span>
                          </>
                        )}
                      </p>
                      <p className="mt-2 text-sm font-medium text-brand-700">
                        {isOpen ? t('Click to collapse') : t('Click to see available units')}
                      </p>
                    </div>
                    <svg
                      aria-hidden
                      className={'h-6 w-6 text-slate-400 shrink-0 transition-transform ' + (isOpen ? 'rotate-180' : '')}
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
                                  <p className="font-semibold text-slate-900">{t(u.name)}</p>
                                  {u.unit_number && (
                                    <span className="text-xs font-mono text-slate-500">{t('Unit')} {u.unit_number}</span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-slate-700">
                                  ${Number(u.monthly_rate).toFixed(2)}
                                  <span className="text-slate-500">/{t('month')}</span>
                                </p>
                                {u.description && (
                                  <p className="mt-1 text-xs text-slate-600">{u.description}</p>
                                )}
                                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
                                  {u.category && (
                                    <div><dt className="inline text-slate-500">{t('Category:')} </dt><dd className="inline">{t(u.category)}</dd></div>
                                  )}
                                  {u.year && (
                                    <div><dt className="inline text-slate-500">{t('Year:')} </dt><dd className="inline">{u.year}</dd></div>
                                  )}
                                  {u.make && (
                                    <div><dt className="inline text-slate-500">{t('Make:')} </dt><dd className="inline">{u.make}</dd></div>
                                  )}
                                  {u.model && (
                                    <div><dt className="inline text-slate-500">{t('Model:')} </dt><dd className="inline">{u.model}</dd></div>
                                  )}
                                  {u.vin && (
                                    <div className="col-span-2 sm:col-span-3">
                                      <dt className="inline text-slate-500">{t('VIN:')} </dt>
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
                                {isSelected ? t('Selected') : t('Select')}
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
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('Booking')}</p>
              <p className="font-semibold text-slate-900 truncate">{t(selected.name)}</p>
              <p className="text-sm text-slate-600">
                ${Number(selected.monthly_rate).toFixed(2)}/{t('month')}
                {selected.unit_number ? ` · ${t('Unit')} ${selected.unit_number}` : ''}
              </p>
            </div>
          </div>

          <form onSubmit={handleRent} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>{t('Start date')}</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t('End date')}</label>
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
                {busy ? t('Booking…') : t('Book rental')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setSelectedId(null); setStartDate(''); setEndDate(''); setError(null); }}
              >
                {t('Cancel')}
              </button>
            </div>
          </form>
        </section>
      )}

      {error && !selected && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">{t('Your rentals')}</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700 text-left">
              <tr>
                <th className="px-4 py-2">{t('Unit #')}</th>
                <th className="px-4 py-2">{t('Equipment')}</th>
                <th className="px-4 py-2">{t('Dates')}</th>
                <th className="px-4 py-2">{t('Total')}</th>
                <th className="px-4 py-2">{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-4 py-2 font-mono text-slate-700">{r.equipment_unit_number || '—'}</td>
                  <td className="px-4 py-2">{t(r.equipment_name)}</td>
                  <td className="px-4 py-2">
                    {new Date(r.start_date).toLocaleDateString()} –{' '}
                    {new Date(r.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">${Number(r.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {rentals.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>{t('No rentals yet.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
