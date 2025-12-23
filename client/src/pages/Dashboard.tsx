import React, { useEffect, useState } from "react";
import { Container, Typography, Grid, Paper, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
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
  totalAmount: number;
  clientCount: number;
  pendingInvoices: number;
  overdueInvoices: number;
  paidInvoices: number;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
}

interface ApiResponse<T> {
  data: T[];
  total: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalInvoices: 0,
    totalAmount: 0,
    clientCount: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    paidInvoices: 0,
  });

  const { token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;

      try {
        const invoicesRes = await fetch("/api/invoices", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!invoicesRes.ok) {
          throw new Error(`Status: ${invoicesRes.status}`);
        }

        const invoicesData = (await invoicesRes.json()) as ApiResponse<Invoice>;
        const invoices = invoicesData.data || [];

        const clientsRes = await fetch("/api/clients", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!clientsRes.ok) {
          throw new Error(`Status: ${clientsRes.status}`);
        }

        const clientsData = (await clientsRes.json()) as ApiResponse<any>;
        const clients = clientsData.data || [];

        const totalAmount = invoices.reduce(
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

        setStats({
          totalInvoices: invoices.length,
          totalAmount,
          clientCount: clients.length,
          pendingInvoices,
          overdueInvoices,
          paidInvoices,
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
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="primary">
              Total Invoices
            </Typography>
            <Typography variant="h3">{stats.totalInvoices}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="primary">
              Total Revenue
            </Typography>
            <Typography variant="h3">
              ${stats.totalAmount.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="primary">
              Total Clients
            </Typography>
            <Typography variant="h3">{stats.clientCount}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="success.main">
              Paid
            </Typography>
            <Typography variant="h3">{stats.paidInvoices}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="warning.main">
              Pending
            </Typography>
            <Typography variant="h3">{stats.pendingInvoices}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6" color="error.main">
              Overdue
            </Typography>
            <Typography variant="h3">{stats.overdueInvoices}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Invoice Status Chart */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
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
              label={({ name, percent }: { name: string; percent: number }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
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
    </Container>
  );
};

export default Dashboard;
