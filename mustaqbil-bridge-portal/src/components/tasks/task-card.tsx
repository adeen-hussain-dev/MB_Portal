type TaskCardProps = {
  title: string;
  owner: string;
  status: string;
};

export function TaskCard({ title, owner, status }: TaskCardProps) {
  return (
    <article className="rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#101828]">{title}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-[#64748B]">
        <span>{owner}</span>
        <span className="rounded-full bg-white px-2 py-1 font-medium text-[#0F3F7F]">{status}</span>
      </div>
    </article>
  );
}
