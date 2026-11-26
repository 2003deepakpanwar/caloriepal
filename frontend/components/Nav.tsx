'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/food-tracker', label: 'Food' },
  { href: '/dinner-planner', label: 'Dinner' },
  { href: '/onboarding', label: 'Profile' },
];

export function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white px-4 py-6 md:block">
      <div className="px-2 text-lg font-semibold tracking-tight">CaloriePal</div>
      <nav className="mt-8 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-10 border-t border-neutral-200 pt-6 text-sm">
        <div className="truncate px-3 text-neutral-600">{user?.name}</div>
        <button
          onClick={logout}
          className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
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
    <nav className="sticky bottom-0 z-10 flex items-center justify-around border-t border-neutral-200 bg-white px-2 py-2 md:hidden">
      {links.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(link.href + '/');
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-1 rounded-md px-2 py-2 text-center text-xs font-medium ${
              active ? 'text-emerald-700' : 'text-neutral-600'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
