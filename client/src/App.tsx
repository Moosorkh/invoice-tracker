import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import InvoiceDetail from './components/InvoiceDetail';
import LoanDetail from './components/LoanDetail';
import Home from './pages/Home';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import TenantLayout from './pages/tenant/Layout';
import Dashboard from './pages/tenant/Dashboard';
import ClientsPage from './pages/tenant/Clients';
import InvoicesPage from './pages/tenant/Invoices';
import LoansPage from './pages/tenant/Loans';
import BillingPage from './pages/tenant/Billing';
import PortalLayout from './pages/portal/Layout';
import PortalDashboard from './pages/portal/Dashboard';
import PortalSetPassword from './pages/portal/SetPassword';
import PortalForgotPassword from './pages/portal/ForgotPassword';
import PortalAuthVerify from './pages/portal/AuthVerify';

function LegacyLoanRedirect() {
  const { id } = useParams();
  const tenantSlug = typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null;

  if (!id) return <Navigate to="/" replace />;
  if (!tenantSlug) return <Navigate to="/login" replace />;
  return <Navigate to={`/t/${tenantSlug}/loans/${id}`} replace />;
}

function LegacyInvoiceRedirect() {
  const { id } = useParams();
  const tenantSlug = typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null;

  if (!id) return <Navigate to="/" replace />;
  if (!tenantSlug) return <Navigate to="/login" replace />;
  return <Navigate to={`/t/${tenantSlug}/invoices/${id}`} replace />;
}

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Legacy non-tenant routes (redirect) */}
        <Route path="/loans/:id" element={<LegacyLoanRedirect />} />
        <Route path="/invoices/:id" element={<LegacyInvoiceRedirect />} />
        
        {/* Staff tenant routes */}
        <Route path="/t/:slug" element={<TenantLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="loans/:id" element={<LoanDetail />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="portal/auth/verify" element={<PortalAuthVerify />} />
        </Route>

        {/* Client portal routes */}
        <Route path="/portal/:slug" element={<PortalLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PortalDashboard />} />
          <Route path="set-password" element={<PortalSetPassword />} />
          <Route path="forgot-password" element={<PortalForgotPassword />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
