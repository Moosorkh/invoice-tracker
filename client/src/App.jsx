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
import Login from "./pages/Login";
import Register from "./pages/Register";
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
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/:id" element={<LoanDetail />} />
            <Route path="/clients" element={<Clients />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;