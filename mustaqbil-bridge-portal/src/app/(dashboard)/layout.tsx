import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { TopHeader } from '@/components/layout/top-header';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Bridge Dashboard',
  description: 'Volunteer operations and task coordination dashboard.',
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const { data: { user } } = await supabase.auth.getUser(token);

  let initialRole = 'volunteer';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.status?.toLowerCase() === 'inactive') {
      await supabase.auth.signOut();
      redirect('/login?error=suspended');
    }

    if (profile?.role) {
      initialRole = profile.role;
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F5F7FA] text-[#101828]">
      <div className="flex min-h-screen w-full min-w-0">
        <Sidebar initialRole={initialRole} />
        <div className="flex min-w-0 max-w-full flex-1 flex-col lg:ml-72">
          <TopHeader />
          <main className="page-fade min-w-0 max-w-full flex-1 overflow-x-hidden p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
