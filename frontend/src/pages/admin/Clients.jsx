import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const EMPTY_EDIT = { id: null, name: '', email: '', password: '' };

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [edit, setEdit] = useState(EMPTY_EDIT);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setClients(await api('/users?role=client'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  function startEdit(c) {
    setEdit({ id: c.id, name: c.name, email: c.email, password: '' });
    setError(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = { name: edit.name, email: edit.email };
      if (edit.password) body.password = edit.password;
      await api(`/users/${edit.id}`, { method: 'PUT', body });
      setEdit(EMPTY_EDIT);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id, name) {
    if (!confirm(`Delete client "${name}"? Their rentals, payments, and claims will remain but show no client.`)) return;
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
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-slate-600">Edit and remove client accounts. Clients self-register via the public page.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {edit.id && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Edit client #{edit.id}</h2>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-3">
            <div className="field">
              <label>Name</label>
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                required
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>New password (optional)</label>
              <input
                type="password"
                minLength={6}
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <button className="btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEdit(EMPTY_EDIT)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">All clients</h2>
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
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-slate-200">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-slate-600">{c.email}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="btn-secondary" onClick={() => startEdit(c)}>Edit</button>
                    <button className="btn-danger" onClick={() => remove(c.id, c.name)}>Delete</button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>No clients yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
