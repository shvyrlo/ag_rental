import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function MechanicEquipment() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/equipment').then(setItems).catch(err => setError(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipment</h1>
        <p className="text-slate-600">Read-only view of the catalog.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700 text-left">
            <tr>
              <th className="px-4 py-2">Unit #</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-slate-200 align-top">
                <td className="px-4 py-2 font-mono text-slate-700">{it.unit_number || '—'}</td>
                <td className="px-4 py-2 font-medium">{it.name}</td>
                <td className="px-4 py-2 text-slate-600">{it.category || '—'}</td>
                <td className="px-4 py-2 text-slate-600">{it.description || '—'}</td>
                <td className="px-4 py-2"><StatusBadge status={it.status} /></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No equipment in the catalog.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
