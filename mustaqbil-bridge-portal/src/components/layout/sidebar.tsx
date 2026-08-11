'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/team', label: 'Team' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-[#0F3F7F] px-6 py-6 text-white">
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center">
          <Image src="/logo.png" alt="Mustaqbil Bridge" width={176} height={62} priority />
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.26em] text-white/60">Portal</p>
          <p className="mt-1 text-sm text-white/85">Volunteer operations, task reviews, and coordination.</p>
        </div>
      </div>

      <nav className="mt-8 space-y-2">
        {links.map((link) => {
          const active = isActivePath(pathname, link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center rounded-xl border-l-4 px-4 py-3 text-sm font-medium transition ${
                active
                  ? 'border-l-[#FFC107] bg-white/10 text-white shadow-[0_10px_30px_-22px_rgba(0,0,0,0.55)]'
                  : 'border-l-transparent text-white/75 hover:bg-white/5 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-white/60">Brand palette</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#FFC107]" />
          <span className="h-3 w-3 rounded-full bg-white" />
          <span className="h-3 w-3 rounded-full bg-[#0F3F7F] ring-1 ring-white/30" />
        </div>
      </div>
    </aside>
  );
}
