import React, { useEffect, useState } from "react";
import { Container, Typography, Grid, Paper, Box, CircularProgress } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import WarningIcon from "@mui/icons-material/Warning";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtCount = (n: number) => new Intl.NumberFormat("en-US").format(n);

interface Stats {
  totalInvoices: number;
  totalInvoiceAmount: number;
  totalLoans: number;
  totalLoanPrincipal: number;
  totalCollected: number;
  clientCount: number;
  pendingInvoices: number;
  overdueInvoices: number;
  paidInvoices: number;
  activeLoans: number;
  closedLoans: number;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
}

interface Loan {
  id: string;
  principal: string;
  totalPaid: string;
  status: string;
}

interface ApiResponse<T> {
  data: T[];
  total: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalInvoices: 0,
    totalInvoiceAmount: 0,
    totalLoans: 0,
    totalLoanPrincipal: 0,
    totalCollected: 0,
    clientCount: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    paidInvoices: 0,
    activeLoans: 0,
    closedLoans: 0,
  });
  const [loading, setLoading] = useState(true);

  const { token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;

      try {
        const [invoicesRes, clientsRes, loansRes] = await Promise.all([
          authFetch("/api/invoices"),
          authFetch("/api/clients"),
          authFetch("/api/loans"),
        ]);

        if (!invoicesRes.ok || !clientsRes.ok || !loansRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const invoicesData = (await invoicesRes.json()) as ApiResponse<Invoice>;
        const invoices = invoicesData.data || [];

        const clientsData = (await clientsRes.json()) as ApiResponse<any>;
        const clients = clientsData.data || [];

        const loansData = (await loansRes.json()) as ApiResponse<Loan>;
        const loans = loansData.data || [];

        const totalInvoiceAmount = invoices.reduce(
          (sum, invoice) => sum + parseFloat(invoice.amount as any),
          0
        );
        const pendingInvoices = invoices.filter(
          (inv) => inv.status === "pending"
        ).length;
        const overdueInvoices = invoices.filter(
          (inv) => inv.status === "overdue"
        ).length;
        const paidInvoices = invoices.filter(
          (inv) => inv.status === "paid"
        ).length;

        const totalLoanPrincipal = loans.reduce(
          (sum, loan) => sum + parseFloat(loan.principal),
          0
        );
        const totalCollected = loans.reduce(
          (sum, loan) => sum + parseFloat(loan.totalPaid),
          0
        );
        const activeLoans = loans.filter(
          (loan) => loan.status === "active"
        ).length;
        const closedLoans = loans.filter(
          (loan) => loan.status === "paid_off" || loan.status === "closed"
        ).length;

        setStats({
          totalInvoices: invoices.length,
          totalInvoiceAmount,
          totalLoans: loans.length,
          totalLoanPrincipal,
          totalCollected,
          clientCount: clients.length,
          pendingInvoices,
          overdueInvoices,
          paidInvoices,
          activeLoans,
          closedLoans,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  // Stat card helper
  const StatCard = ({ label, value, icon, color, bgcolor }: { label: string; value: string; icon: React.ReactNode; color: string; bgcolor: string }) => (
    <Paper sx={{ p: 3, bgcolor, borderRadius: 2, display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ color, fontSize: 40, display: "flex" }}>{icon}</Box>
      <Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
      </Box>
    </Paper>
  );
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Overview Stats */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Overview</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StatCard label="Total Clients" value={fmtCount(stats.clientCount)} icon={<PeopleIcon fontSize="inherit" />} color="#1565c0" bgcolor="#e3f2fd" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Loan Portfolio" value={fmt(stats.totalLoanPrincipal)} icon={<AccountBalanceIcon fontSize="inherit" />} color="#2e7d32" bgcolor="#e8f5e9" />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Total Collected" value={fmt(stats.totalCollected)} icon={<AttachMoneyIcon fontSize="inherit" />} color="#6a1b9a" bgcolor="#f3e5f5" />
        </Grid>
      </Grid>

      {/* Invoice Stats */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Invoices</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <StatCard label="Total Invoices" value={fmtCount(stats.totalInvoices)} icon={<ReceiptIcon fontSize="inherit" />} color="#1565c0" bgcolor="#e3f2fd" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Paid" value={fmtCount(stats.paidInvoices)} icon={<CheckCircleIcon fontSize="inherit" />} color="#2e7d32" bgcolor="#e8f5e9" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Pending" value={fmtCount(stats.pendingInvoices)} icon={<HourglassEmptyIcon fontSize="inherit" />} color="#e65100" bgcolor="#fff3e0" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Overdue" value={fmtCount(stats.overdueInvoices)} icon={<WarningIcon fontSize="inherit" />} color="#c62828" bgcolor="#ffebee" />
        </Grid>
      </Grid>

      {/* Loan Stats */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Loans</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <StatCard label="Total Loans" value={fmtCount(stats.totalLoans)} icon={<AccountBalanceIcon fontSize="inherit" />} color="#1565c0" bgcolor="#e3f2fd" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Active" value={fmtCount(stats.activeLoans)} icon={<TrendingUpIcon fontSize="inherit" />} color="#2e7d32" bgcolor="#e8f5e9" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Closed" value={fmtCount(stats.closedLoans)} icon={<CheckCircleIcon fontSize="inherit" />} color="#546e7a" bgcolor="#eceff1" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard label="Total Collected" value={fmt(stats.totalCollected)} icon={<AttachMoneyIcon fontSize="inherit" />} color="#6a1b9a" bgcolor="#f3e5f5" />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Invoice Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Paid", value: stats.paidInvoices },
                    { name: "Pending", value: stats.pendingInvoices },
                    { name: "Overdue", value: stats.overdueInvoices },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const name = props?.name ?? "";
                    const percent = typeof props?.percent === "number" ? props.percent : 0;
                    return name ? `${name}: ${(percent * 100).toFixed(0)}%` : `${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#4caf50" />
                  <Cell fill="#ff9800" />
                  <Cell fill="#f44336" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Loan Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Active", value: stats.activeLoans },
                    { name: "Closed", value: stats.closedLoans },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const name = props?.name ?? "";
                    const percent = typeof props?.percent === "number" ? props.percent : 0;
                    return name ? `${name}: ${(percent * 100).toFixed(0)}%` : `${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#2196f3" />
                  <Cell fill="#9e9e9e" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
