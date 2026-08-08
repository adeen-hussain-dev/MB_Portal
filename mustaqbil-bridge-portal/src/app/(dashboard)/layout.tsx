import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

export const metadata = {
  title: 'Bridge Dashboard',
  description: 'Volunteer operations and task coordination dashboard.',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
