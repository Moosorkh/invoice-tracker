'use client';

import React, { useState, useEffect } from "react";
import { TextField, Button, Container, Typography, Box, Alert, CircularProgress, Tabs, Tab, IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function PortalLogin() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const { setSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!tenantSlug) {
      setError("Invalid portal URL. Please use the link provided by your lender.");
    }
  }, [tenantSlug]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/t/${tenantSlug}/portal/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      setSession(data.token, { id: data.user.id, email: data.user.email, tenantSlug });
      router.push(`/portal/${tenantSlug}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`/t/${tenantSlug}/portal/auth/request-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send magic link");
      }

      setSuccess(data.message);
      setShowTokenInput(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/t/${tenantSlug}/portal/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Invalid or expired token");
      }

      setSession(data.token, { id: '', email, tenantSlug });
      
      router.push(`/portal/${tenantSlug}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Borrower Portal
        </Typography>
        <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 4 }}>
          Access your loans and account information
        </Typography>

        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} centered sx={{ mb: 3 }}>
          <Tab label="Password Login" />
          <Tab label="Magic Link" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {tabValue === 0 && (
          <form onSubmit={handlePasswordLogin}>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, mb: 1 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Log In"}
            </Button>
            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Link href={`/portal/${tenantSlug}/forgot-password`}>
                <Typography variant="body2" component="span" sx={{ cursor: "pointer", color: "primary.main" }}>
                  Forgot your password?
                </Typography>
              </Link>
            </Box>
          </form>
        )}

        {tabValue === 1 && !showTokenInput && (
          <form onSubmit={handleRequestLink}>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={loading}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Send Login Link"}
            </Button>
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <Button size="small" onClick={() => setShowTokenInput(true)}>
                  Already have a token?
                </Button>
              </Typography>
            </Box>
          </form>
        )}
        
        {tabValue === 1 && showTokenInput && (
          <form onSubmit={handleVerifyToken}>
            <Alert severity="info" sx={{ mb: 2 }}>
              For testing: Check the server logs on Railway for your magic link token
            </Alert>
            <TextField
              label="Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={loading}
              helperText="Enter the token from your email or server logs"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Verify & Login"}
            </Button>
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <Button size="small" onClick={() => setShowTokenInput(false)}>
                  Request a new link
                </Button>
              </Typography>
            </Box>
          </form>
        )}
      </Box>
    </Container>
  );
}
