import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePortalSlug, portalPath } from "../hooks/usePortalSlug";

const PortalNavbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const tenantSlug = usePortalSlug();

  const handleLogout = () => {
    logout();
    if (tenantSlug) {
      navigate(`/portal/${tenantSlug}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Borrower Portal
        </Typography>
        
        {isAuthenticated && tenantSlug ? (
          <Box>
            <Button color="inherit" component={Link} to={portalPath(tenantSlug, "dashboard")}>
              My Dashboard
            </Button>
            <Button color="inherit" component={Link} to={portalPath(tenantSlug, "loans")}>
              My Loans
            </Button>
            <Button color="inherit" component={Link} to={portalPath(tenantSlug, "profile")}>
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
