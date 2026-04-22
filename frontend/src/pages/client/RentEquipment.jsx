import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function RentEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [form, setForm] = useState({ equipment_id: '', start_date: '', end_date: '' });
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

  async function handleRent(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/rentals', { method: 'POST', body: form });
      setForm({ equipment_id: '', start_date: '', end_date: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const available = equipment.filter(e => e.status === 'available');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Rent equipment</h1>
        <p className="text-slate-600">Book available equipment for a date range.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">New rental</h2>
        <form onSubmit={handleRent} className="grid gap-4 sm:grid-cols-4">
          <div className="field sm:col-span-2">
            <label>Equipment</label>
            <select
              required
              value={form.equipment_id}
              onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}
            >
              <option value="">Select…</option>
              {available.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.unit_number ? `[${eq.unit_number}] ` : ''}{eq.name} — ${Number(eq.monthly_rate).toFixed(2)}/mo
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Start date</label>
            <input
              type="date"
              required
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="field">
            <label>End date</label>
            <input
              type="date"
              required
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
          {error && <p className="sm:col-span-4 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-4">
            <button className="btn-primary" disabled={busy}>
              {busy ? 'Booking…' : 'Book rental'}
            </button>
          </div>
        </form>

        {available.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            No equipment is available right now.
          </p>
        )}
      </section>

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
