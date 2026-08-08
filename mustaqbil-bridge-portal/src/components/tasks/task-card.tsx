type TaskCardProps = {
  title: string;
  owner: string;
  status: string;
};

export function TaskCard({ title, owner, status }: TaskCardProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-sm font-medium text-slate-100">{title}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{owner}</span>
        <span className="rounded-full bg-slate-800 px-2 py-1">{status}</span>
      </div>
    </article>
  );
}
