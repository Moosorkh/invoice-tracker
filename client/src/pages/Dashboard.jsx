import React, { useEffect, useState } from "react";
import { Container, Typography, Grid, Paper, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    clientCount: 0
  });
  
  const { token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return; // Don't attempt to fetch if no token
      
      try {
        // Get invoices with auth token
        const invoicesRes = await fetch("/api/invoices", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!invoicesRes.ok) {
          throw new Error(`Status: ${invoicesRes.status}`);
        }
        
        const invoices = await invoicesRes.json();
        
        // Get clients with auth token
        const clientsRes = await fetch("/api/clients", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!clientsRes.ok) {
          throw new Error(`Status: ${clientsRes.status}`);
        }
        
        const clients = await clientsRes.json();
        
        // Calculate stats (check if invoices is an array)
        const totalAmount = Array.isArray(invoices) 
          ? invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
          : 0;
        
        setStats({
          totalInvoices: Array.isArray(invoices) ? invoices.length : 0,
          totalAmount,
          clientCount: Array.isArray(clients) ? clients.length : 0
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    
    fetchStats();
  }, [token]); // Add token as a dependency

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
            <Typography variant="h3">${stats.totalAmount.toFixed(2)}</Typography>
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
      </Grid>
    </Container>
  );
};

export default Dashboard;