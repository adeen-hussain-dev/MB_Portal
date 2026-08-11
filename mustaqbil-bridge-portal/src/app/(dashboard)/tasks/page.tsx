import { KanbanBoard } from '@/components/tasks/kanban-board';

const seedTasks = [
  { id: 'task-1', title: 'Prepare volunteer pack', status: 'todo' as const, owner: 'Aisha' },
  { id: 'task-2', title: 'Confirm pickup route', status: 'in_progress' as const, owner: 'Nadia' },
  { id: 'task-3', title: 'Share donor update', status: 'done' as const, owner: 'Omar' },
];

export default function TasksPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">Task board</p>
        <h1 className="font-heading text-3xl font-semibold text-[#101828]">Kanban overview</h1>
        <p className="text-sm text-[#64748B]">Move work between stages and keep the team aligned.</p>
      </header>

      <KanbanBoard tasks={seedTasks} />
    </section>
  );
}
