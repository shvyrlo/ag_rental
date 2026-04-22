import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setPayments(await api('/payments'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function markPaid(id) {
    try {
      await api(`/payments/${id}/pay`, { method: 'POST', body: { method: 'admin-mark' } });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function refund(id) {
    if (!confirm('Refund this payment?')) return;
    try {
      await api(`/payments/${id}/refund`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const totals = payments.reduce(
    (acc, p) => {
      const amt = Number(p.amount);
      if (p.status === 'paid') acc.paid += amt;
      else if (p.status === 'pending') acc.pending += amt;
      return acc;
    },
    { paid: 0, pending: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-slate-600">
          Collected:{' '}
          <span className="font-semibold text-slate-900">${totals.paid.toFixed(2)}</span>
          {' · '}
          Pending:{' '}
          <span className="font-semibold text-slate-900">${totals.pending.toFixed(2)}</span>
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700 text-left">
            <tr>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Rental</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-200">
                <td className="px-4 py-2">
                  <div className="font-medium">{p.client_name}</div>
                  <div className="text-xs text-slate-500">{p.client_email}</div>
                </td>
                <td className="px-4 py-2">{p.equipment_name || '—'}</td>
                <td className="px-4 py-2">${Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-2 text-right space-x-2">
                  {p.status === 'pending' && (
                    <button className="btn-primary" onClick={() => markPaid(p.id)}>
                      Mark paid
                    </button>
                  )}
                  {p.status === 'paid' && (
                    <button className="btn-danger" onClick={() => refund(p.id)}>
                      Refund
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
