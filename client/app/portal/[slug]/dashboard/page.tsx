'use client';

import React, { useState, useEffect } from "react";
import { Container, Typography, Box, Card, CardContent, Grid, Alert, CircularProgress } from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";

export default function PortalDashboard() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token || !tenantSlug) {
        setError("Missing authentication or tenant information");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/t/${tenantSlug}/portal/api/dashboard`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to load dashboard");
        }

        const dashboardData = await res.json();
        setData(dashboardData);
      } catch (err) {
        console.error("Portal dashboard error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [tenantSlug, token]);

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {data?.client?.name}
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Your Client Portal Dashboard
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Loans
                </Typography>
                <Typography variant="h3">{data?.loans?.length || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Invoices
                </Typography>
                <Typography variant="h3">{data?.invoices?.length || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {data?.loans && data.loans.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Your Loans
                  </Typography>
                  {data.loans.map((loan: any) => (
                    <Box key={loan.id} sx={{ mb: 2, p: 2, border: "1px solid #ddd", borderRadius: 1 }}>
                      <Typography variant="subtitle1">
                        Loan #{loan.loanNumber}
                      </Typography>
                      <Typography variant="body2">
                        Principal: ${parseFloat(loan.principal).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        Status: {loan.status}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}

          {data?.invoices && data.invoices.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Invoices
                  </Typography>
                  {data.invoices.map((invoice: any) => (
                    <Box key={invoice.id} sx={{ mb: 2, p: 2, border: "1px solid #ddd", borderRadius: 1 }}>
                      <Typography variant="subtitle1">
                        Invoice #{invoice.invoiceNumber}
                      </Typography>
                      <Typography variant="body2">
                        Amount: ${parseFloat(invoice.amount).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        Status: {invoice.status}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>
  );
}
