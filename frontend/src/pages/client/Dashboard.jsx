import IconCard from '../../components/IconCard.jsx';
import { useT } from '../../i18n/i18n.jsx';
import equipmentIcon from '../../assets/icons/admin/equipment.png';
import inspectionsIcon from '../../assets/icons/admin/inspections.png';
import paymentsIcon from '../../assets/icons/admin/payments.png';
import repairClaimsIcon from '../../assets/icons/admin/repair-claims.png';
import leaseApplicationsIcon from '../../assets/icons/admin/lease-applications.png';

export default function ClientDashboard() {
  const t = useT();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">{t('Client')}</h1>

      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-3">
        <IconCard to="/client/rent" image={equipmentIcon} title={t('Rent equipment')} />
        <IconCard to="/client/inspections" image={inspectionsIcon} title={t('Inspections')} />
        <IconCard to="/client/payments" image={paymentsIcon} title={t('Payments')} />
        <IconCard to="/client/repair-claims" image={repairClaimsIcon} title={t('Repair claims')} />
        <IconCard to="/client/lease-application" image={leaseApplicationsIcon} title={t('Lease application')} />
      </div>
    </div>
  );
}
