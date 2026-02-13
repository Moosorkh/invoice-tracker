
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  
  // Get tenant slug for scoped routes
  const tenantSlug = user?.tenantSlug;
  const baseUrl = tenantSlug ? `/t/${tenantSlug}` : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
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
              <Button color="inherit" component={Link} to={`${baseUrl}/`}>
                Dashboard
              </Button>
              <Button color="inherit" component={Link} to={`${baseUrl}/invoices`}>
                Invoices
              </Button>
              <Button color="inherit" component={Link} to={`${baseUrl}/loans`}>
                Loans
              </Button>
              <Button color="inherit" component={Link} to={`${baseUrl}/clients`}>
                Clients
              </Button>
              <Button color="inherit" component={Link} to={`${baseUrl}/billing`}>
                Billing
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          </>
        ) : (
          <Box>
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
            <Button color="inherit" component={Link} to="/register">
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
