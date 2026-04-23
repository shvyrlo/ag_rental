import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const CATEGORIES = ['Step deck', 'Flatbed', 'Reefer', 'Conestoga', 'Peterbilt 579', 'Freightliner Cascadia'];

const EMPTY = {
  unit_number: '',
  category: '',
  description: '',
  monthly_rate: '',
  status: 'available',
};

export default function AdminEquipment() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setItems(await api('/equipment'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = { ...form, monthly_rate: Number(form.monthly_rate || 0) };
      if (editingId) {
        await api(`/equipment/${editingId}`, { method: 'PUT', body });
      } else {
        await api('/equipment', { method: 'POST', body });
      }
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      unit_number: item.unit_number || '',
      category: item.category || '',
      description: item.description || '',
      monthly_rate: item.monthly_rate ?? '',
      status: item.status || 'available',
    });
  }

  async function remove(id) {
    if (!confirm('Delete this equipment?')) return;
    try {
      await api(`/equipment/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Equipment</h1>
        <p className="text-slate-600">Manage the equipment catalog.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? `Edit equipment #${editingId}` : 'Add equipment'}
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
          <div className="field">
            <label>Unit number</label>
            <input
              value={form.unit_number}
              onChange={(e) => setForm({ ...form, unit_number: e.target.value })}
              placeholder="e.g. EX-0042"
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monthly rate</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.monthly_rate}
              onChange={(e) => setForm({ ...form, monthly_rate: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="field sm:col-span-3">
            <label>Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-3 flex gap-2">
            <button className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : editingId ? 'Update' : 'Add'}
            </button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Catalog</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700 text-left">
              <tr>
                <th className="px-4 py-2">Unit #</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Monthly rate</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-200">
                  <td className="px-4 py-2 font-mono text-slate-700">{it.unit_number || '—'}</td>
                  <td className="px-4 py-2 font-medium">{it.name}</td>
                  <td className="px-4 py-2 text-slate-600">{it.category || '—'}</td>
                  <td className="px-4 py-2">${Number(it.monthly_rate).toFixed(2)}/mo</td>
                  <td className="px-4 py-2"><StatusBadge status={it.status} /></td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="btn-secondary" onClick={() => startEdit(it)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(it.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No equipment yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
