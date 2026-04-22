import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const EMPTY = { name: '', email: '', password: '' };

export default function AdminMechanics() {
  const [mechanics, setMechanics] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setMechanics(await api('/users?role=mechanic'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/users', { method: 'POST', body: { ...form, role: 'mechanic' } });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id, name) {
    if (!confirm(`Delete mechanic "${name}"? This cannot be undone.`)) return;
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Mechanics</h1>
        <p className="text-slate-600">Create and remove mechanic accounts.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Add a mechanic</h2>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
          <div className="field">
            <label>Full name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-3">
            <button className="btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create mechanic'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">All mechanics</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {mechanics.map((m) => (
                <tr key={m.id} className="border-t border-slate-200">
                  <td className="px-4 py-2 font-medium">{m.name}</td>
                  <td className="px-4 py-2 text-slate-600">{m.email}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="btn-danger" onClick={() => remove(m.id, m.name)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {mechanics.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>No mechanics yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
