import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchTaskById } from '@/lib/portal-data'
import { CommentComposer } from '@/components/tasks/comment-composer'

const statusStyles: Record<string, string> = {
  todo: 'bg-[#FFF4CC] text-[#8A5B00]',
  in_progress: 'bg-[#EAF1FF] text-[#0F3F7F]',
  in_review: 'bg-[#F2F3F5] text-[#475467]',
  done: 'bg-[#EAF7EE] text-[#166534]',
  changes_requested: 'bg-[#FEE4E2] text-[#B42318]',
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await fetchTaskById(id)

  if (!task) {
    notFound()
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[#D8E0EA] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">Task detail</p>
            <h1 className="font-heading text-3xl font-semibold text-[#101828]">{task.title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-[#64748B]">{task.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status] ?? 'bg-[#F5F7FA] text-[#64748B]'}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span className="rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-semibold text-[#0F3F7F]">{task.priority}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            ['Assignee', task.assigneeName],
            ['Email', task.assigneeEmail],
            ['Domain', task.domain],
            ['Due date', task.dueDate],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#F5F7FA] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">{label}</p>
              <p className="mt-1 text-sm font-medium text-[#101828]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-[2rem] border border-[#D8E0EA] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-[#101828]">Comments</h2>
            <p className="text-sm text-[#64748B]">Visible to the task team</p>
          </div>

          <div className="mt-5 space-y-4">
            {task.comments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D8E0EA] bg-[#F5F7FA] p-5 text-sm text-[#64748B]">
                No comments yet. This task discussion will appear here once team members start leaving feedback.
              </div>
            ) : task.comments.map((comment) => (
              <article key={comment.id} className="rounded-2xl bg-[#F5F7FA] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">{comment.author}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">{comment.role}</p>
                  </div>
                  <p className="text-xs text-[#64748B]">{new Date(comment.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#475467]">{comment.content}</p>
              </article>
            ))}
          </div>

          <CommentComposer taskId={task.id} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-[#D8E0EA] bg-white p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold text-[#101828]">Task file set</h2>
            <div className="mt-4 space-y-2">
              {task.attachments.length > 0 ? (
                task.attachments.map((attachment) => {
                  const isUrl = attachment.startsWith('http://') || attachment.startsWith('https://')
                  const fileName = attachment.split('/').pop()?.split('_').slice(1).join('_') || attachment

                  return isUrl ? (
                    <a
                      key={attachment}
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate rounded-xl bg-[#F5F7FA] px-4 py-3 text-sm text-[#0F3F7F] transition hover:bg-[#EAF1FF] hover:underline"
                    >
                      📎 {fileName}
                    </a>
                  ) : (
                    <div key={attachment} className="truncate rounded-xl bg-[#F5F7FA] px-4 py-3 text-sm text-[#101828]">
                      📎 {attachment}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-[#64748B]">No attachments yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#D8E0EA] bg-[#0F3F7F] p-6 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Status note</p>
            <p className="mt-3 text-sm leading-6 text-white/85">
              Current status is shown here, while the eventual activity log will remain admin-only as defined in the guide.
            </p>
          </div>
        </aside>
      </div>

      <Link href="/tasks" className="inline-flex items-center text-sm font-medium text-[#0F3F7F] hover:text-[#123f79]">
        ← Back to tasks
      </Link>
    </section>
  )
}
