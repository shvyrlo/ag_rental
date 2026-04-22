import IconCard from '../../components/IconCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ClientDashboard() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">
        Welcome{user ? `, ${user.name}` : ''}
      </h1>
      <p className="mt-1 text-slate-600">Your client dashboard.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <IconCard
          to="/client/rent"
          icon="🚜"
          title="Rent equipment"
          description="Browse the catalog and book equipment."
        />
        <IconCard
          to="/client/inspections"
          icon="🔍"
          title="Inspections"
          description="Request and track inspections."
        />
        <IconCard
          to="/client/payments"
          icon="💳"
          title="Payments"
          description="Pay invoices and see history."
        />
        <IconCard
          to="/client/repair-claims"
          icon="🛠️"
          title="Repair claims"
          description="File a repair claim for rented equipment."
        />
        <IconCard
          to="/client/lease-application"
          icon="📝"
          title="Lease application"
          description="Submit a lease application with company details and documents."
        />
      </div>
    </div>
  );
}
