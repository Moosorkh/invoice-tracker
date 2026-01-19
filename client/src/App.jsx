import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import PortalNavbar from "./components/PortalNavbar";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./components/InvoiceDetail";
import Loans from "./pages/Loans";
import LoanDetail from "./components/LoanDetail";
import Clients from "./pages/Clients";
import Billing from "./pages/Billing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PortalLogin from "./pages/PortalLogin";
import PortalDashboard from "./pages/PortalDashboard";
import SetPassword from "./pages/SetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";

// Redirect root to tenant-scoped URL if tenant exists
const RootRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const tenantSlug = localStorage.getItem('tenantSlug');
    if (tenantSlug) {
      navigate(`/t/${tenantSlug}/`, { replace: true });
    } else {
      // No tenant, redirect to login
      navigate('/login', { replace: true });
    }
  }, [navigate]);
  
  return null;
};

// Conditional navbar component
const ConditionalNavbar = () => {
  const location = useLocation();
  const isPortalRoute = location.pathname.startsWith('/portal/') || 
                        location.pathname.startsWith('/borrower/') ||
                        location.pathname.includes('/portal');
  
  // Don't show navbar on login pages
  if (location.pathname.includes('/login') || 
      location.pathname.includes('/set-password') ||
      location.pathname.includes('/forgot-password')) {
    return null;
  }
  
  return isPortalRoute ? <PortalNavbar /> : <Navbar />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <ConditionalNavbar />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Borrower portal routes - cleaner URLs */}
          <Route path="/portal/:tenantSlug" element={<PortalLogin />} />
          <Route path="/portal/:tenantSlug/set-password" element={<SetPassword />} />
          <Route path="/portal/:tenantSlug/forgot-password" element={<ForgotPassword />} />
          <Route path="/borrower/:tenantSlug" element={<PortalLogin />} />
          {/* Legacy portal URL for backwards compatibility */}
          <Route path="/t/:tenantSlug/portal/login" element={<PortalLogin />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/portal/:tenantSlug/dashboard" element={<PortalDashboard />} />
            <Route path="/borrower/:tenantSlug/dashboard" element={<PortalDashboard />} />
            {/* Legacy */}
            <Route path="/t/:tenantSlug/portal" element={<PortalDashboard />} />
          </Route>
          
          {/* Protected staff routes - tenant-scoped */}
          <Route element={<ProtectedRoute />}>
            <Route path="/t/:tenantSlug/" element={<Dashboard />} />
            <Route path="/t/:tenantSlug/invoices" element={<Invoices />} />
            <Route path="/t/:tenantSlug/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/t/:tenantSlug/loans" element={<Loans />} />
            <Route path="/t/:tenantSlug/loans/:id" element={<LoanDetail />} />
            <Route path="/t/:tenantSlug/clients" element={<Clients />} />
            <Route path="/t/:tenantSlug/billing" element={<Billing />} />
          </Route>
          
          {/* Legacy routes (backward compatibility) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/:id" element={<LoanDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/billing" element={<Billing />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;