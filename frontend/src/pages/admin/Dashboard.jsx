import IconCard from '../../components/IconCard.jsx';
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
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Admin</h1>

      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-3">
        <IconCard to="/admin/equipment" image={equipmentIcon} title="Equipment" />
        <IconCard to="/admin/rentals" image={rentalsIcon} title="Rentals" />
        <IconCard to="/admin/inspections" image={inspectionsIcon} title="Inspections" />
        <IconCard to="/admin/payments" image={paymentsIcon} title="Payments" />
        <IconCard to="/admin/repair-claims" image={repairClaimsIcon} title="Repair claims" />
        <IconCard to="/admin/mechanics" image={mechanicsIcon} title="Mechanics" />
        <IconCard to="/admin/clients" image={clientsIcon} title="Clients" />
        <IconCard to="/admin/lease-applications" image={leaseApplicationsIcon} title="Lease applications" />
        <IconCard to="/admin/qr-codes" image={qrCodesIcon} title="QR codes" />
      </div>
    </div>
  );
}
