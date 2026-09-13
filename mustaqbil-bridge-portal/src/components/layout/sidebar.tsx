'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOutIcon, MenuIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/notifications/notification-bell';

const links = [
  { href: '/overview', label: 'Overview' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/analytics', label: 'My Analytics', volunteerOnly: true },
  { href: '/team', label: 'Team', adminOrManagerOnly: true },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/overview') return pathname === '/overview';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ initialRole }: { initialRole?: string } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
    avatar_url?: string | null;
  } | null>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('full_name, email, role, avatar_url')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserProfile(data);
            } else {
              setUserProfile({ email: user.email ?? '' });
            }
          });
      }
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const currentRole = userProfile?.role ?? initialRole;
  const isVolunteer = (currentRole ?? 'volunteer') === 'volunteer';
  const visibleLinks = links.filter((link) => {
    if (link.adminOrManagerOnly && isVolunteer) {
      return false;
    }
    if ((link as { volunteerOnly?: boolean }).volunteerOnly && !isVolunteer) {
      return false;
    }
    return true;
  });

  function renderProfileCard() {
    const displayName = userProfile?.full_name || userProfile?.email || 'Logged User';
    const initial = displayName.charAt(0).toUpperCase();
    const roleText = userProfile?.role || 'Volunteer';

    return (
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-3.5">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="group flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-85"
            title="View & edit your profile"
          >
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFC107] font-bold text-[#0F3F7F] text-xs shadow-inner transition group-hover:ring-2 group-hover:ring-white/40">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt={displayName} className="size-9 object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white group-hover:text-[#FFC107] transition-colors">{displayName}</p>
              <p className="truncate text-[10px] capitalize tracking-wider text-white/60">{roleText}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/80 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-300"
          >
            <LogOutIcon className="size-4" />
            <span className="sr-only">Sign out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#0F3F7F] px-4 text-white shadow-sm lg:hidden">
        <Link href="/overview" className="inline-flex items-center">
          <Image src="/Logo_Yellow.svg" alt="Mustaqbil Bridge" width={128} height={42} />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell theme="dark" />
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
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[#0F3F7F] px-6 py-6 text-white lg:flex">
        <div className="space-y-6">
          <Link href="/overview" className="inline-flex items-center">
            <Image src="/Logo_Yellow.svg" alt="Mustaqbil Bridge" width={176} height={62} priority />
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.26em] text-white/60">Portal</p>
            <p className="mt-1 text-sm text-white/85">Volunteer operations, task reviews, and coordination.</p>
          </div>
        </div>

        <nav className="mt-8 space-y-2">
          {visibleLinks.map((link) => {
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

        {renderProfileCard()}
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent showCloseButton={false} className="left-0 top-0 h-full max-w-[320px] translate-x-0 translate-y-0 rounded-none border-0 bg-[#0F3F7F] p-0 text-white shadow-2xl sm:max-w-[360px]">
          <div className="flex h-full flex-col px-5 py-5">
            <DialogHeader className="flex-row items-center justify-between gap-3">
              <DialogTitle className="sr-only">Navigation</DialogTitle>
              <Link href="/overview" className="inline-flex items-center">
                <Image src="/Logo_Yellow.svg" alt="Mustaqbil Bridge" width={148} height={50} />
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
              {visibleLinks.map((link) => {
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

            {renderProfileCard()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
