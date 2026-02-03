'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const tenantSlug = localStorage.getItem('tenantSlug');
    if (tenantSlug) {
      router.replace(`/t/${tenantSlug}/`);
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
