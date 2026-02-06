'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Alert, Container, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

export default function VerifyMagicLink() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const token = searchParams.get('token');
  const { setSession } = useAuth();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !slug) {
        setStatus('error');
        setError('Invalid or missing verification token');
        return;
      }

      try {
        const res = await fetch(`/t/${slug}/portal/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        setSession(data.token, { id: '', email: '', tenantSlug: slug });
        setStatus('success');

        // Redirect to portal dashboard after 1.5 seconds
        setTimeout(() => {
          router.push(`/portal/${slug}/dashboard`);
        }, 1500);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to verify token');
      }
    };

    verifyToken();
  }, [token, slug, router]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {status === 'verifying' && (
          <Box textAlign="center">
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 3 }}>
              Verifying your login link...
            </Typography>
          </Box>
        )}
                  setSession(data.token, { id: '', email: '', tenantSlug: slug });
            <Typography variant="h5" gutterBottom>
              Login Successful!
            </Typography>
            <Typography color="text.secondary">
              Redirecting to your dashboard...
            </Typography>

        {status === 'success' && (
          <Box textAlign="center">
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        )}

        {status === 'error' && (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary" align="center">
              The link may have expired or already been used.
            </Typography>
            <Typography variant="body2" align="center" sx={{ mt: 2 }}>
              <a href={`/portal/${slug}`} style={{ color: '#1976d2' }}>
                Return to login
              </a>
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}
