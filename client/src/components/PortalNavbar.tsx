import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PortalNavbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const tenantSlug = slug;

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
          Client Portal
        </Typography>
        
        {isAuthenticated ? (
          <Box>
            <Button 
              color="inherit" 
              component={Link} 
              to={`/portal/${tenantSlug}/dashboard`}
              disabled={!tenantSlug}
            >
              My Dashboard
            </Button>
            <Button 
              color="inherit" 
              component={Link} 
              to={`/portal/${tenantSlug}/loans`}
              disabled={!tenantSlug}
            >
              My Loans
            </Button>
            <Button 
              color="inherit" 
              component={Link} 
              to={`/portal/${tenantSlug}/profile`}
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
