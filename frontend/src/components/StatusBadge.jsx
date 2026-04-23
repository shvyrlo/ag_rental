import { useT } from '../i18n/i18n.jsx';

const COLORS = {
  available: 'bg-green-100 text-green-800',
  rented: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-slate-200 text-slate-700',

  pending: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',

  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',

  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-slate-200 text-slate-700',

  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',

  approved: 'bg-green-100 text-green-800',
};

export default function StatusBadge({ status }) {
  const t = useT();
  if (!status) return null;
  const cls = COLORS[status] || 'bg-slate-100 text-slate-700';
  const human = String(status).replace('_', ' ');
  return (
    <span className={`badge ${cls}`}>
      {t(human)}
    </span>
  );
}
