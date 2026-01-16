import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PortalNavbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  const handleLogout = () => {
    logout();
    navigate(`/portal/${tenantSlug}`);
  };

  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Borrower Portal
        </Typography>
        
        {isAuthenticated ? (
          <Box>
            <Button color="inherit" component={Link} to={`/portal/${tenantSlug}/dashboard`}>
              My Dashboard
            </Button>
            <Button color="inherit" component={Link} to={`/portal/${tenantSlug}/loans`}>
              My Loans
            </Button>
            <Button color="inherit" component={Link} to={`/portal/${tenantSlug}/profile`}>
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
