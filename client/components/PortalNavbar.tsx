'use client';

import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const PortalNavbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.slug as string | undefined;

  const handleLogout = () => {
    logout();
    if (tenantSlug) {
      router.push(`/portal/${tenantSlug}`);
    } else {
      router.push('/login');
    }
  };

  const portalPath = (path: string) => {
    return tenantSlug ? `/portal/${tenantSlug}/${path}` : '#';
  };

  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Borrower Portal
        </Typography>
        
        {isAuthenticated ? (
          <Box>
            <Button 
              color="inherit" 
              component={Link} 
              href={portalPath("dashboard")}
              disabled={!tenantSlug}
            >
              My Dashboard
            </Button>
            <Button 
              color="inherit" 
              component={Link} 
              href={portalPath("loans")}
              disabled={!tenantSlug}
            >
              My Loans
            </Button>
            <Button 
              color="inherit" 
              component={Link} 
              href={portalPath("profile")}
              disabled={!tenantSlug}
            >
              Profile
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        ) : null}
      </Toolbar>
    </AppBar>
  );
};

export default PortalNavbar;
