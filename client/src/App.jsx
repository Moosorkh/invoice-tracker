import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
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
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Client portal routes */}
          <Route path="/t/:tenantSlug/portal/login" element={<PortalLogin />} />
          <Route element={<ProtectedRoute />}>
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
            <Route path="/" element={<Dashboard />} />
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