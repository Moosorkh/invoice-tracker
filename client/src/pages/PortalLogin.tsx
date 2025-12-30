import React, { useState } from "react";
import { TextField, Button, Container, Typography, Box, Alert, CircularProgress } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PortalLogin = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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

      // Login with portal JWT
      login(data.token, { userId: "", email });
      
      // Redirect to portal dashboard
      navigate(`/t/${tenantSlug}/portal`);
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
          Client Portal Login
        </Typography>
        <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 4 }}>
          Enter your email to receive a secure login link
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {!showTokenInput ? (
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
        ) : (
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
};

export default PortalLogin;
