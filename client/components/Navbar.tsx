'use client';

import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const router = useRouter();
  
  // Get tenant slug for scoped routes
  const tenantSlug = user?.tenantSlug;
  const baseUrl = tenantSlug ? `/t/${tenantSlug}` : '';

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Loan Servicing
        </Typography>
        
        {isAuthenticated ? (
          <>
            <Box>
              <Button color="inherit" component={Link} href={`${baseUrl}/`}>
                Dashboard
              </Button>
              <Button color="inherit" component={Link} href={`${baseUrl}/invoices`}>
                Invoices
              </Button>
              <Button color="inherit" component={Link} href={`${baseUrl}/loans`}>
                Loans
              </Button>
              <Button color="inherit" component={Link} href={`${baseUrl}/clients`}>
                Clients
              </Button>
              <Button color="inherit" component={Link} href={`${baseUrl}/billing`}>
                Billing
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          </>
        ) : (
          <Box>
            <Button color="inherit" component={Link} href="/login">
              Login
            </Button>
            <Button color="inherit" component={Link} href="/register">
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
