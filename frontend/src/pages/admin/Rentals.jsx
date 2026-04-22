import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const FILTERS = [
  { value: 'pending',   label: 'Pending approval' },
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all',       label: 'All' },
];

export default function AdminRentals() {
  const [rentals, setRentals] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);

  async function load() {
    try {
      setRentals(await api('/rentals'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    if (status === 'cancelled'
        && !confirm('Reject this rental? The client will see it as cancelled.')) return;
    setError(null);
    setSaving(id);
    try {
      await api(`/rentals/${id}`, { method: 'PUT', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  const visible = useMemo(() => {
    if (filter === 'all') return rentals;
    return rentals.filter((r) => r.status === filter);
  }, [rentals, filter]);

  const counts = useMemo(() => {
    const c = { pending: 0, active: 0, completed: 0, cancelled: 0 };
    for (const r of rentals) if (c[r.status] !== undefined) c[r.status]++;
    return c;
  }, [rentals]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rentals</h1>
        <p className="text-slate-600">
          Review client rental requests, approve or reject them, and mark active
          rentals complete when the equipment comes back.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.value === 'all' ? rentals.length : counts[f.value] ?? 0;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={
                'px-3 py-1.5 rounded-md text-sm border ' +
                (active
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300')
              }
            >
              {f.label} <span className={active ? 'text-slate-300' : 'text-slate-400'}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700 text-left">
            <tr>
              <th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Equipment</th>
              <th className="px-4 py-2">Dates</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-slate-200 align-top">
                <td className="px-4 py-2 text-slate-600">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <div className="font-medium">{r.client_name}</div>
                  <div className="text-xs text-slate-500">{r.client_email}</div>
                </td>
                <td className="px-4 py-2">
                  {r.equipment_unit_number
                    ? <span className="font-mono text-slate-700">[{r.equipment_unit_number}] </span>
                    : null}
                  {r.equipment_name}
                </td>
                <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                  {new Date(r.start_date).toLocaleDateString()}
                  {' – '}
                  {new Date(r.end_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">${Number(r.total_amount).toFixed(2)}</td>
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {r.status === 'pending' && (
                      <>
                        <button
                          className="btn-primary text-xs"
                          disabled={saving === r.id}
                          onClick={() => setStatus(r.id, 'active')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-danger text-xs"
                          disabled={saving === r.id}
                          onClick={() => setStatus(r.id, 'cancelled')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {r.status === 'active' && (
                      <>
                        <button
                          className="btn-secondary text-xs"
                          disabled={saving === r.id}
                          onClick={() => setStatus(r.id, 'completed')}
                        >
                          Mark completed
                        </button>
                        <button
                          className="btn-danger text-xs"
                          disabled={saving === r.id}
                          onClick={() => setStatus(r.id, 'cancelled')}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {(r.status === 'completed' || r.status === 'cancelled') && (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>
                  No rentals in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
