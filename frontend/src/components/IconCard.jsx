import { Link } from 'react-router-dom';

export default function IconCard({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-accent-500 transition"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-50 text-accent-600 text-2xl group-hover:bg-accent-600 group-hover:text-white transition">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        )}
      </div>
    </Link>
  );
}
