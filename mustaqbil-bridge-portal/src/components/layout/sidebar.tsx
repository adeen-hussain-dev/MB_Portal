'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MenuIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#0F3F7F] px-4 text-white shadow-sm lg:hidden">
        <Link href="/" className="inline-flex items-center">
          <Image src="/logo.png" alt="Mustaqbil Bridge" width={128} height={42} />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="border border-white/15 bg-white/10 text-white hover:bg-white/15"
          onClick={() => setMobileOpen(true)}
        >
          <MenuIcon />
          <span className="sr-only">Open navigation</span>
        </Button>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[#0F3F7F] px-6 py-6 text-white lg:flex">
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

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent showCloseButton={false} className="left-0 top-0 h-full max-w-[320px] translate-x-0 translate-y-0 rounded-none border-0 bg-[#0F3F7F] p-0 text-white shadow-2xl sm:max-w-[360px]">
          <div className="flex h-full flex-col px-5 py-5">
            <DialogHeader className="flex-row items-center justify-between gap-3">
              <DialogTitle className="sr-only">Navigation</DialogTitle>
              <Link href="/" className="inline-flex items-center">
                <Image src="/logo.png" alt="Mustaqbil Bridge" width={148} height={50} />
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="border border-white/15 bg-white/10 text-white hover:bg-white/15"
                onClick={() => setMobileOpen(false)}
              >
                <XIcon />
                <span className="sr-only">Close navigation</span>
              </Button>
            </DialogHeader>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.26em] text-white/60">Portal</p>
              <p className="mt-1 text-sm text-white/85">Volunteer operations, task reviews, and coordination.</p>
            </div>

            <nav className="mt-6 space-y-2">
              {links.map((link) => {
                const active = isActivePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center rounded-xl border-l-4 px-4 py-3 text-sm font-medium transition ${
                      active
                        ? 'border-l-[#FFC107] bg-white/10 text-white'
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
