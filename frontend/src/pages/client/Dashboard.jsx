import IconCard from '../../components/IconCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import equipmentIcon from '../../assets/icons/admin/equipment.png';
import inspectionsIcon from '../../assets/icons/admin/inspections.png';
import paymentsIcon from '../../assets/icons/admin/payments.png';
import repairClaimsIcon from '../../assets/icons/admin/repair-claims.png';
import leaseApplicationsIcon from '../../assets/icons/admin/lease-applications.png';

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
          image={equipmentIcon}
          title="Rent equipment"
          description="Browse the catalog and book equipment."
        />
        <IconCard
          to="/client/inspections"
          image={inspectionsIcon}
          title="Inspections"
          description="Request and track inspections."
        />
        <IconCard
          to="/client/payments"
          image={paymentsIcon}
          title="Payments"
          description="Pay invoices and see history."
        />
        <IconCard
          to="/client/repair-claims"
          image={repairClaimsIcon}
          title="Repair claims"
          description="File a repair claim for rented equipment."
        />
        <IconCard
          to="/client/lease-application"
          image={leaseApplicationsIcon}
          title="Lease application"
          description="Submit a lease application with company details and documents."
        />
      </div>
    </div>
  );
}
