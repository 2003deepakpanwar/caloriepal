'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

type Icon = (props: { className?: string }) => React.ReactNode;

const HomeIcon: Icon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </svg>
);

const ForkIcon: Icon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 3v8a3 3 0 0 0 6 0V3" />
    <path d="M10 11v10" />
    <path d="M17 3c-1.5 0-3 1-3 4v5a2 2 0 0 0 2 2h1v7" />
  </svg>
);

const BowlIcon: Icon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 11h18" />
    <path d="M4 11a8 8 0 0 0 16 0" />
    <path d="M12 6v2" />
    <path d="M9 8l1-2" />
    <path d="M15 8l-1-2" />
  </svg>
);

const UserIcon: Icon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const links: Array<{ href: string; label: string; icon: Icon }> = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/food-tracker', label: 'Food', icon: ForkIcon },
  { href: '/dinner-planner', label: 'Dinner', icon: BowlIcon },
  { href: '/onboarding', label: 'Profile', icon: UserIcon },
];

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200/80 bg-white px-4 py-6 md:flex">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M5 11a7 7 0 1 1 14 0c0 5-4 10-7 10S5 16 5 11z" />
            <path d="M12 7v4" />
          </svg>
        </div>
        <div className="text-base font-semibold tracking-tight">CaloriePal</div>
      </div>
      <nav className="mt-8 flex-1 space-y-0.5">
        {links.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + '/');
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-neutral-200/80 pt-4">
        <div className="truncate px-3 text-xs text-neutral-400">Signed in as</div>
        <div className="truncate px-3 text-sm font-medium text-neutral-700">{user?.name}</div>
        <button
          onClick={logout}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-10 flex items-center justify-around border-t border-neutral-200/80 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
      {links.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(link.href + '/');
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
              active ? 'text-emerald-700' : 'text-neutral-500'
            }`}
          >
            <Icon className="h-5 w-5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
