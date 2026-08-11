import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

export const metadata = {
  title: 'Bridge Dashboard',
  description: 'Volunteer operations and task coordination dashboard.',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#101828]">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="page-fade flex-1 p-6 pt-24 lg:ml-72 lg:p-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
