import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Link,
} from "@mui/material";
import { CheckCircle, Email } from "@mui/icons-material";
import axios from "axios";
import { usePortalSlug } from "../hooks/usePortalSlug";

const ForgotPassword: React.FC = () => {
  const slug = usePortalSlug();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!slug) {
      setError("Invalid portal URL");
    }
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`/t/${slug}/portal/auth/forgot-password`, {
        email: email.toLowerCase(),
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
          }}
        >
          <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Check Your Email
          </Typography>
          <Typography color="text.secondary" paragraph>
            If an account exists for {email}, we've sent a password reset link.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            The link will expire in 1 hour.
          </Typography>
          <Button
            component={RouterLink}
            to={`/portal/${slug}`}
            variant="outlined"
            sx={{ mt: 2 }}
          >
            Back to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: "100%",
        }}
      >
        <Email sx={{ fontSize: 48, color: "primary.main", mb: 2, display: "block", mx: "auto" }} />
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          Forgot Password?
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          Enter your email address and we'll send you a link to reset your password
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            disabled={loading || !slug}
            autoFocus
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !slug}
            sx={{ mt: 3 }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Link component={RouterLink} to={`/portal/${slug}`} variant="body2">
              Back to Login
            </Link>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default ForgotPassword;
