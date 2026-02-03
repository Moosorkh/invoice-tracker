'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Container, CircularProgress, Box } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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

  return <>{children}</>;
}
