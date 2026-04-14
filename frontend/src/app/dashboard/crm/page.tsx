'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** CRM root redirects to Contacts (default HubSpot behavior) */
export default function CRMPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/crm/contacts');
  }, [router]);
  return null;
}
