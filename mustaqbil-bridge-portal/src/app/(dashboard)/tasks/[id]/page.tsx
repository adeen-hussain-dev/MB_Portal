import Link from 'next/link';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Task detail</p>
        <h1 className="mt-2 text-3xl font-semibold">Task {id}</h1>
        <p className="mt-3 text-sm text-slate-400">
          Use this route to show full task details, comments, and status history.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold">Notes</h2>
        <p className="mt-3 text-sm text-slate-400">
          This placeholder is ready for a richer detail view backed by Supabase.
        </p>
      </div>

      <Link href="/tasks" className="inline-block text-sm text-cyan-400 hover:text-cyan-300">
        ← Back to tasks
      </Link>
    </section>
  );
}
