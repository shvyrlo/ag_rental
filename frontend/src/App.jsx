import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Verify from './pages/Verify.jsx';

import ClientDashboard from './pages/client/Dashboard.jsx';
import RentEquipment from './pages/client/RentEquipment.jsx';
import ClientInspections from './pages/client/Inspections.jsx';
import ClientPayments from './pages/client/Payments.jsx';
import ClientRepairClaims from './pages/client/RepairClaims.jsx';
import ClientLeaseApplication from './pages/client/LeaseApplication.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminEquipment from './pages/admin/Equipment.jsx';
import AdminRentals from './pages/admin/Rentals.jsx';
import AdminInspections from './pages/admin/Inspections.jsx';
import AdminPayments from './pages/admin/Payments.jsx';
import AdminRepairClaims from './pages/admin/RepairClaims.jsx';
import AdminMechanics from './pages/admin/Mechanics.jsx';
import AdminClients from './pages/admin/Clients.jsx';
import AdminLeaseApplications from './pages/admin/LeaseApplications.jsx';
import AdminQrCodes from './pages/admin/QrCodes.jsx';

import MechanicDashboard from './pages/mechanic/Dashboard.jsx';
import MechanicEquipment from './pages/mechanic/Equipment.jsx';
import MechanicRepairClaims from './pages/mechanic/RepairClaims.jsx';

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />

          {/* Client */}
          <Route path="/client" element={
            <ProtectedRoute roles={['client']}><ClientDashboard /></ProtectedRoute>
          } />
          <Route path="/client/rent" element={
            <ProtectedRoute roles={['client']}><RentEquipment /></ProtectedRoute>
          } />
          <Route path="/client/inspections" element={
            <ProtectedRoute roles={['client']}><ClientInspections /></ProtectedRoute>
          } />
          <Route path="/client/payments" element={
            <ProtectedRoute roles={['client']}><ClientPayments /></ProtectedRoute>
          } />
          <Route path="/client/repair-claims" element={
            <ProtectedRoute roles={['client']}><ClientRepairClaims /></ProtectedRoute>
          } />
          <Route path="/client/lease-application" element={
            <ProtectedRoute roles={['client']}><ClientLeaseApplication /></ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/equipment" element={
            <ProtectedRoute roles={['admin']}><AdminEquipment /></ProtectedRoute>
          } />
          <Route path="/admin/rentals" element={
            <ProtectedRoute roles={['admin']}><AdminRentals /></ProtectedRoute>
          } />
          <Route path="/admin/inspections" element={
            <ProtectedRoute roles={['admin']}><AdminInspections /></ProtectedRoute>
          } />
          <Route path="/admin/payments" element={
            <ProtectedRoute roles={['admin']}><AdminPayments /></ProtectedRoute>
          } />
          <Route path="/admin/repair-claims" element={
            <ProtectedRoute roles={['admin']}><AdminRepairClaims /></ProtectedRoute>
          } />
          <Route path="/admin/mechanics" element={
            <ProtectedRoute roles={['admin']}><AdminMechanics /></ProtectedRoute>
          } />
          <Route path="/admin/clients" element={
            <ProtectedRoute roles={['admin']}><AdminClients /></ProtectedRoute>
          } />
          <Route path="/admin/lease-applications" element={
            <ProtectedRoute roles={['admin']}><AdminLeaseApplications /></ProtectedRoute>
          } />
          <Route path="/admin/qr-codes" element={
            <ProtectedRoute roles={['admin']}><AdminQrCodes /></ProtectedRoute>
          } />

          {/* Mechanic */}
          <Route path="/mechanic" element={
            <ProtectedRoute roles={['mechanic']}><MechanicDashboard /></ProtectedRoute>
          } />
          <Route path="/mechanic/equipment" element={
            <ProtectedRoute roles={['mechanic']}><MechanicEquipment /></ProtectedRoute>
          } />
          <Route path="/mechanic/repair-claims" element={
            <ProtectedRoute roles={['mechanic']}><MechanicRepairClaims /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <div className="font-semibold text-white">AG Truck &amp; Trailer Rental</div>
            <p className="mt-2 text-slate-400">
              DOT-ready trucks and trailers in Channahon, IL.
            </p>
          </div>
          <div>
            <div className="font-semibold text-white">Explore</div>
            <ul className="mt-2 space-y-1">
              <li><a href="/#difference" className="hover:text-white">The AG Difference</a></li>
              <li><a href="/#fleet" className="hover:text-white">Our Fleet</a></li>
              <li><a href="/#process" className="hover:text-white">Pricing &amp; Process</a></li>
              <li><a href="/#lease" className="hover:text-white">Lease application</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white">Call us for a quote</div>
            <ul className="mt-2 space-y-1">
              <li><a href="tel:+16308539348" className="hover:text-white">(630) 853-9348</a></li>
              <li><a href="tel:+16308530090" className="hover:text-white">(630) 853-0090</a></li>
              <li>
                <a href="mailto:trucktrailerrental@agholding.us" className="hover:text-white">
                  trucktrailerrental@agholding.us
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white">Visit us</div>
            <p className="mt-2 text-slate-400">
              24307 Riverside Dr<br />
              Channahon, IL 60410
            </p>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500">
            © {new Date().getFullYear()} AG Truck &amp; Trailer Rental
          </div>
        </div>
      </footer>
    </div>
  );
}
