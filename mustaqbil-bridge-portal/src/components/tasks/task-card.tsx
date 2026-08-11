import Link from 'next/link'
import type { TaskPriority, TaskStatus } from '@/lib/task-store'

type TaskCardProps = {
  href: string
  title: string
  description: string
  assigneeName: string
  assigneeEmail: string
  domain: string
  dueDate: string
  status: TaskStatus
  priority: TaskPriority
  attachmentCount: number
}

const statusStyles: Record<TaskStatus, string> = {
  todo: 'bg-[#FFF4CC] text-[#8A5B00]',
  in_progress: 'bg-[#EAF1FF] text-[#0F3F7F]',
  in_review: 'bg-[#F2F3F5] text-[#475467]',
  done: 'bg-[#EAF7EE] text-[#166534]',
  changes_requested: 'bg-[#FEE4E2] text-[#B42318]',
}

const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-[#F5F7FA] text-[#64748B]',
  medium: 'bg-[#FFF4CC] text-[#8A5B00]',
  high: 'bg-[#FEE4E2] text-[#B42318]',
}

export function TaskCard({
  href,
  title,
  description,
  assigneeName,
  assigneeEmail,
  domain,
  dueDate,
  status,
  priority,
  attachmentCount,
}: TaskCardProps) {
  return (
    <Link href={href} className="block rounded-[2rem] border border-[#D8E0EA] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_-40px_rgba(15,63,127,0.4)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-base font-semibold text-[#101828]">{title}</p>
          <p className="max-w-2xl text-sm leading-6 text-[#64748B]">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>{status.replace('_', ' ')}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[priority]}`}>{priority}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-[#E6EDF5] pt-4 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Assignee</p>
          <p className="mt-1 text-sm font-medium text-[#101828]">{assigneeName}</p>
          <p className="text-xs text-[#64748B]">{assigneeEmail}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Domain</p>
          <p className="mt-1 text-sm font-medium text-[#101828]">{domain}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Due date</p>
          <p className="mt-1 text-sm font-medium text-[#101828]">{dueDate}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Attachments</p>
          <p className="mt-1 text-sm font-medium text-[#101828]">{attachmentCount} file{attachmentCount === 1 ? '' : 's'}</p>
        </div>
      </div>
    </Link>
  )
}
