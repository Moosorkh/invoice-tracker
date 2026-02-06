'use client';

import React, { useState, useEffect } from "react";
import { TextField, Button, Container, Typography, Box, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });
  const [error, setError] = useState("");
  const router = useRouter();
  const { setSession, token } = useAuth();

  useEffect(() => {
    if (token) {
      router.push("/");
    }
  }, [token, router]);

  const { email, password, confirmPassword, companyName } = formData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, companyName }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();
      
      if (!loginRes.ok) {
        throw new Error(loginData.error || "Login failed");
      }

      setSession(loginData.token, {
        id: loginData.userId,
        email: loginData.email,
        tenantSlug: loginData.tenantSlug,
      });
      
      router.replace(`/t/${loginData.tenantSlug}/`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Register
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Company Name"
            type="text"
            name="companyName"
            value={companyName}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            helperText="This will be used to create your unique workspace URL"
          />
          <TextField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3, mb: 2 }}
          >
            Register
          </Button>
          <Box textAlign="center">
            <Typography variant="body2">
              Already have an account?{" "}
              <Link href="/login">Login here</Link>
            </Typography>
          </Box>
        </form>
      </Box>
    </Container>
  );
}
