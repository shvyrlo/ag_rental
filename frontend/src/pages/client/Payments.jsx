import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function ClientPayments() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);
  const [payingId, setPayingId] = useState(null);

  async function load() {
    try {
      setPayments(await api('/payments'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function pay(id) {
    setPayingId(id);
    setError(null);
    try {
      await api(`/payments/${id}/pay`, { method: 'POST', body: { method: 'card' } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPayingId(null);
    }
  }

  const totalOutstanding = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-slate-600">
          Outstanding balance:{' '}
          <span className="font-semibold text-slate-900">
            ${totalOutstanding.toFixed(2)}
          </span>
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700 text-left">
            <tr>
              <th className="px-4 py-2">Rental</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-200">
                <td className="px-4 py-2">
                  {p.equipment_name ? `${p.equipment_name} (#${p.rental_id})` : '—'}
                </td>
                <td className="px-4 py-2">${Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-2 capitalize">{p.method || '—'}</td>
                <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-2 text-right">
                  {p.status === 'pending' && (
                    <button
                      className="btn-primary"
                      onClick={() => pay(p.id)}
                      disabled={payingId === p.id}
                    >
                      {payingId === p.id ? 'Processing…' : 'Pay now'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No payments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
