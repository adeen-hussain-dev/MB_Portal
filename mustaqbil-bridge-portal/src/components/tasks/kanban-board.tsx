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
        <section key={column.key} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">{column.title}</h2>
            <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
              {tasks.filter((task) => task.status === column.key).length}
            </span>
          </div>

          <div className="space-y-3">
            {tasks
              .filter((task) => task.status === column.key)
              .map((task) => (
                <article key={task.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-sm font-medium text-slate-100">{task.title}</p>
                  <p className="mt-2 text-xs text-slate-500">Owner: {task.owner}</p>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
