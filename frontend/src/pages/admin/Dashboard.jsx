import IconCard from '../../components/IconCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import equipmentIcon from '../../assets/icons/admin/equipment.png';
import rentalsIcon from '../../assets/icons/admin/rentals.png';
import inspectionsIcon from '../../assets/icons/admin/inspections.png';
import paymentsIcon from '../../assets/icons/admin/payments.png';
import repairClaimsIcon from '../../assets/icons/admin/repair-claims.png';
import mechanicsIcon from '../../assets/icons/admin/mechanics.png';
import clientsIcon from '../../assets/icons/admin/clients.png';
import leaseApplicationsIcon from '../../assets/icons/admin/lease-applications.png';
import qrCodesIcon from '../../assets/icons/admin/qr-codes.png';

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
          image={equipmentIcon}
          title="Equipment"
          description="Add, edit, and retire equipment."
        />
        <IconCard
          to="/admin/rentals"
          image={rentalsIcon}
          title="Rentals"
          description="Approve or reject pending client rental requests."
        />
        <IconCard
          to="/admin/inspections"
          image={inspectionsIcon}
          title="Inspections"
          description="Review and update inspections."
        />
        <IconCard
          to="/admin/payments"
          image={paymentsIcon}
          title="Payments"
          description="Create, pay, refund."
        />
        <IconCard
          to="/admin/repair-claims"
          image={repairClaimsIcon}
          title="Repair claims"
          description="Assign and track claim progress."
        />
        <IconCard
          to="/admin/mechanics"
          image={mechanicsIcon}
          title="Mechanics"
          description="Add, remove, and edit mechanic accounts."
        />
        <IconCard
          to="/admin/clients"
          image={clientsIcon}
          title="Clients"
          description="Manage client accounts."
        />
        <IconCard
          to="/admin/lease-applications"
          image={leaseApplicationsIcon}
          title="Lease applications"
          description="Review and approve lease applications."
        />
        <IconCard
          to="/admin/qr-codes"
          image={qrCodesIcon}
          title="QR codes"
          description="Generate tracked or general QR codes for advertising."
        />
      </div>
    </div>
  );
}
