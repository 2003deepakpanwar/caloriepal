'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Nav, MobileNav } from '../../components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!user.profile) router.replace('/onboarding');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Nav />
      <div className="flex min-h-screen flex-1 flex-col">
        <div className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
        <MobileNav />
      </div>
    </div>
  );
}
