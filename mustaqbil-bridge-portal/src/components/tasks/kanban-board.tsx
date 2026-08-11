type TaskStatus = 'todo' | 'in_progress' | 'done';

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  owner: string;
};

const columns: Array<{ key: TaskStatus; title: string }> = [
  { key: 'todo', title: 'To do' },
  { key: 'in_progress', title: 'In progress' },
  { key: 'done', title: 'Done' },
];

export function KanbanBoard({ tasks }: { tasks: TaskItem[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map((column) => (
        <section key={column.key} className="rounded-2xl border border-[#D8E0EA] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0F3F7F]">{column.title}</h2>
            <span className="rounded-full bg-[#F5F7FA] px-2 py-1 text-xs font-semibold text-[#64748B]">
              {tasks.filter((task) => task.status === column.key).length}
            </span>
          </div>

          <div className="space-y-3">
            {tasks
              .filter((task) => task.status === column.key)
              .map((task) => (
                <article key={task.id} className="rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] p-4 shadow-sm">
                  <p className="text-sm font-semibold text-[#101828]">{task.title}</p>
                  <p className="mt-2 text-xs text-[#64748B]">Owner: {task.owner}</p>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
