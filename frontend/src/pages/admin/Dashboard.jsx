import IconCard from '../../components/IconCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">
        Admin{user ? ` — ${user.name}` : ''}
      </h1>
      <p className="mt-1 text-slate-600">Manage the rental operation.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <IconCard
          to="/admin/equipment"
          icon="🚜"
          title="Equipment"
          description="Add, edit, and retire equipment."
        />
        <IconCard
          to="/admin/rentals"
          icon="📄"
          title="Rentals"
          description="Approve or reject pending client rental requests."
        />
        <IconCard
          to="/admin/inspections"
          icon="🔍"
          title="Inspections"
          description="Review and update inspections."
        />
        <IconCard
          to="/admin/payments"
          icon="💳"
          title="Payments"
          description="Create, pay, refund."
        />
        <IconCard
          to="/admin/repair-claims"
          icon="🛠️"
          title="Repair claims"
          description="Assign and track claim progress."
        />
        <IconCard
          to="/admin/mechanics"
          icon="👷"
          title="Mechanics"
          description="Add, remove, and edit mechanic accounts."
        />
        <IconCard
          to="/admin/clients"
          icon="👤"
          title="Clients"
          description="Manage client accounts."
        />
        <IconCard
          to="/admin/lease-applications"
          icon="📝"
          title="Lease applications"
          description="Review and approve lease applications."
        />
        <IconCard
          to="/admin/qr-codes"
          icon="🔳"
          title="QR codes"
          description="Generate tracked or general QR codes for advertising."
        />
      </div>
    </div>
  );
}
