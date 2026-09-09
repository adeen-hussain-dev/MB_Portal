import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { TopHeader } from '@/components/layout/top-header';

export const metadata = {
  title: 'Bridge Dashboard',
  description: 'Volunteer operations and task coordination dashboard.',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F5F7FA] text-[#101828]">
      <div className="flex min-h-screen w-full min-w-0">
        <Sidebar />
        <div className="flex min-w-0 max-w-full flex-1 flex-col lg:ml-72">
          <TopHeader />
          <main className="page-fade min-w-0 max-w-full flex-1 overflow-x-hidden p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
