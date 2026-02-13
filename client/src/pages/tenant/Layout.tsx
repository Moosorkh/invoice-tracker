import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Container, CircularProgress, Box } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

export default function TenantLayout() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return <Outlet />;
}
