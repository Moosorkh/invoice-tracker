import { Outlet } from 'react-router-dom';
import { Container } from '@mui/material';

export default function PortalLayout() {
  return (
    <Container>
      <Outlet />
    </Container>
  );
}
