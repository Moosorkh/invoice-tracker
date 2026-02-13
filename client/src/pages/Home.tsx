import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const tenantSlug = localStorage.getItem('tenantSlug');
    if (tenantSlug) {
      navigate(`/t/${tenantSlug}/`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return null;
}
