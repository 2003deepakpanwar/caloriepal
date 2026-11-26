'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Nav, MobileNav } from '../../components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const showBack = pathname !== '/dashboard' && pathname !== '/';

  return (
    <div className="flex min-h-screen">
      <Nav />
      <div className="flex min-h-screen flex-1 flex-col">
        {showBack && (
          <div className="px-4 pt-4 md:px-8 md:pt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-neutral-500 transition hover:text-neutral-900"
            >
              <span aria-hidden>←</span>
              <span>Dashboard</span>
            </Link>
          </div>
        )}
        <div className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
        <MobileNav />
      </div>
    </div>
  );
}
