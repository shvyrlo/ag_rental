import IconCard from '../../components/IconCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import equipmentIcon from '../../assets/icons/admin/equipment.png';
import repairClaimsIcon from '../../assets/icons/admin/repair-claims.png';

export default function MechanicDashboard() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">
        Mechanic{user ? ` — ${user.name}` : ''}
      </h1>
      <p className="mt-1 text-slate-600">Your workbench.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <IconCard
          to="/mechanic/equipment"
          image={equipmentIcon}
          title="List of equipment"
          description="Every piece of equipment in the catalog."
        />
        <IconCard
          to="/mechanic/repair-claims"
          image={repairClaimsIcon}
          title="Repair claims"
          description="Pick up, work, and resolve claims."
        />
      </div>
    </div>
  );
}
