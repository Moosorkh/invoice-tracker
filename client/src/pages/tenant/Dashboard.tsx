import React, { useEffect, useState } from "react";
import { Container, Typography, Grid, Paper } from "@mui/material";
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
          (loan) => loan.status === "closed"
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
      }
    };

    fetchStats();
  }, [token]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Overview Stats */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Overview
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center", bgcolor: "#e3f2fd" }}>
            <Typography variant="h6" color="primary">
              Total Clients
            </Typography>
            <Typography variant="h3">{stats.clientCount}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center", bgcolor: "#f3e5f5" }}>
            <Typography variant="h6" color="secondary">
              Total Revenue
            </Typography>
            <Typography variant="h3">
              ${(stats.totalInvoiceAmount + stats.totalCollected).toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center", bgcolor: "#e8f5e9" }}>
            <Typography variant="h6" color="success.main">
              Loan Portfolio
            </Typography>
            <Typography variant="h3">
              ${stats.totalLoanPrincipal.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Invoice Stats */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Invoices
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="primary">
              Total Invoices
            </Typography>
            <Typography variant="h3">{stats.totalInvoices}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="success.main">
              Paid
            </Typography>
            <Typography variant="h3">{stats.paidInvoices}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="warning.main">
              Pending
            </Typography>
            <Typography variant="h3">{stats.pendingInvoices}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="error.main">
              Overdue
            </Typography>
            <Typography variant="h3">{stats.overdueInvoices}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Loan Stats */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Loans
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="primary">
              Total Loans
            </Typography>
            <Typography variant="h3">{stats.totalLoans}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="success.main">
              Active
            </Typography>
            <Typography variant="h3">{stats.activeLoans}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="info.main">
              Closed
            </Typography>
            <Typography variant="h3">{stats.closedLoans}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="success.main">
              Collected
            </Typography>
            <Typography variant="h3">
              ${stats.totalCollected.toFixed(2)}
            </Typography>
          </Paper>
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
