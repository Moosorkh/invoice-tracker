'use client';

import { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import axios from "axios";
import { useParams } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  price: number;
  limits: {
    maxClients: number;
    maxInvoices: number;
    maxLoans: number;
    maxUsers: number;
  };
  features: string[];
}

interface SubscriptionStatus {
  currentPlan: string;
  status: string;
  subscription: any;
  usage: {
    clients: number;
    invoices: number;
    loans: number;
    users: number;
  };
  limits: {
    maxClients: number;
    maxInvoices: number;
    maxLoans: number;
    maxUsers: number;
  };
  planConfig: Plan;
}

export default function Billing() {
  const params = useParams();
  const slug = params.slug as string;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const [plansRes, statusRes] = await Promise.all([
        axios.get(`/t/${slug}/api/subscriptions/plans`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/t/${slug}/api/subscriptions/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setPlans(plansRes.data.plans);
      setStatus(statusRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setActionLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      if (status?.currentPlan === planId) {
        setError("You are already on this plan");
        return;
      }

      if (status?.subscription && status.currentPlan !== "free") {
        await axios.post(
          `/t/${slug}/api/subscriptions/change-plan`,
          { plan: planId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess("Plan updated successfully!");
        await loadData();
      } else {
        const res = await axios.post(
          `/t/${slug}/api/subscriptions/checkout`,
          { plan: planId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (res.data.url) {
          window.location.href = res.data.url;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upgrade plan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `/t/${slug}/api/subscriptions/portal`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to open billing portal");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.")) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      await axios.post(
        `/t/${slug}/api/subscriptions/cancel`,
        { immediately: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Subscription will be canceled at the end of the billing period");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cancel subscription");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setActionLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      await axios.post(
        `/t/${slug}/api/subscriptions/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Subscription resumed successfully!");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to resume subscription");
    } finally {
      setActionLoading(false);
    }
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return (used / limit) * 100;
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Billing & Subscription
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {status && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current Plan
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Typography variant="h4" sx={{ mr: 2 }}>
                {status.planConfig.name}
              </Typography>
              <Chip
                label={status.status}
                color={status.status === "active" ? "success" : "warning"}
              />
              {status.subscription?.cancelAtPeriodEnd && (
                <Chip
                  label="Canceling at period end"
                  color="warning"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>

            {status.currentPlan !== "free" && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ${status.planConfig.price}/month
              </Typography>
            )}

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Usage
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2">Clients</Typography>
                    <Typography variant="body2">
                      {status.usage.clients} / {formatLimit(status.limits.maxClients)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(status.usage.clients, status.limits.maxClients)}
                    color={
                      getUsagePercentage(status.usage.clients, status.limits.maxClients) > 80
                        ? "warning"
                        : "primary"
                    }
                  />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2">Invoices</Typography>
                    <Typography variant="body2">
                      {status.usage.invoices} / {formatLimit(status.limits.maxInvoices)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(status.usage.invoices, status.limits.maxInvoices)}
                    color={
                      getUsagePercentage(status.usage.invoices, status.limits.maxInvoices) > 80
                        ? "warning"
                        : "primary"
                    }
                  />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2">Loans</Typography>
                    <Typography variant="body2">
                      {status.usage.loans} / {formatLimit(status.limits.maxLoans)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(status.usage.loans, status.limits.maxLoans)}
                    color={
                      getUsagePercentage(status.usage.loans, status.limits.maxLoans) > 80
                        ? "warning"
                        : "primary"
                    }
                  />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2">Users</Typography>
                    <Typography variant="body2">
                      {status.usage.users} / {formatLimit(status.limits.maxUsers)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(status.usage.users, status.limits.maxUsers)}
                    color={
                      getUsagePercentage(status.usage.users, status.limits.maxUsers) > 80
                        ? "warning"
                        : "primary"
                    }
                  />
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              {status.subscription && status.currentPlan !== "free" && (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleManageBilling}
                    disabled={actionLoading}
                  >
                    Manage Billing
                  </Button>
                  {status.subscription.cancelAtPeriodEnd ? (
                    <Button
                      variant="outlined"
                      color="success"
                      onClick={handleResumeSubscription}
                      disabled={actionLoading}
                    >
                      Resume Subscription
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleCancelSubscription}
                      disabled={actionLoading}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      <Typography variant="h5" gutterBottom>
        Available Plans
      </Typography>
      <Grid container spacing={3}>
        {plans.map((plan) => (
          <Grid item xs={12} md={6} lg={3} key={plan.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                border: status?.currentPlan === plan.id ? 2 : 0,
                borderColor: "primary.main",
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="h3" gutterBottom>
                  ${plan.price}
                  {plan.price > 0 && (
                    <Typography variant="caption" component="span">
                      /month
                    </Typography>
                  )}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <List dense>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <CheckIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
                      <ListItemText primary={feature} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>

              <Box sx={{ p: 2 }}>
                <Button
                  variant={status?.currentPlan === plan.id ? "outlined" : "contained"}
                  fullWidth
                  disabled={
                    actionLoading ||
                    status?.currentPlan === plan.id ||
                    plan.id === "free"
                  }
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {status?.currentPlan === plan.id
                    ? "Current Plan"
                    : plan.id === "free"
                    ? "Default Plan"
                    : status?.subscription && status.currentPlan !== "free"
                    ? "Switch Plan"
                    : "Upgrade"}
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="body2">
          <strong>Test Mode:</strong> Use test card 4242 4242 4242 4242 for testing payments.
          No real charges will be made.
        </Typography>
      </Alert>
    </Container>
  );
}
