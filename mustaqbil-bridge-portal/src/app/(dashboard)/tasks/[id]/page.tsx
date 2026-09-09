import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchProfiles, fetchTaskById } from '@/lib/portal-data'
import { createClient } from '@/lib/supabase/server'
import { CommentComposer } from '@/components/tasks/comment-composer'
import { TaskDetailActions } from '@/components/tasks/task-detail-actions'
import { TaskQuestions } from '@/components/tasks/task-questions'
import { DownloadIcon, ExternalLinkIcon, FileIcon, StarIcon } from 'lucide-react'

const statusStyles: Record<string, string> = {
  todo: 'bg-[#FFF4CC] text-[#8A5B00]',
  in_progress: 'bg-[#EAF1FF] text-[#0F3F7F]',
  in_review: 'bg-[#F2F3F5] text-[#475467]',
  done: 'bg-[#EAF7EE] text-[#166534]',
  changes_requested: 'bg-[#FEE4E2] text-[#B42318]',
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'png':
      return 'PNG Image'
    case 'jpg':
    case 'jpeg':
      return 'JPEG Image'
    case 'webp':
      return 'WEBP Image'
    case 'svg':
      return 'SVG Vector'
    case 'gif':
      return 'GIF Image'
    case 'pdf':
      return 'PDF Document'
    case 'doc':
    case 'docx':
      return 'Word Document'
    case 'xls':
    case 'xlsx':
      return 'Excel Spreadsheet'
    case 'ppt':
    case 'pptx':
      return 'PowerPoint Presentation'
    case 'zip':
    case 'rar':
    case '7z':
      return 'Archive File'
    case 'txt':
      return 'Text File'
    default:
      return ext ? `${ext.toUpperCase()} File` : 'File Attachment'
  }
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let currentRole = 'volunteer'
  if (user) {
    const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (userProfile?.role) {
      currentRole = userProfile.role
    }
  }

  const isAdminOrManager = ['admin', 'manager'].includes(currentRole)

  const [task, profiles] = await Promise.all([
    fetchTaskById(id),
    isAdminOrManager ? fetchProfiles() : Promise.resolve([]),
  ])

  if (!task) {
    notFound()
  }

  const isAssignedToUser = Boolean(
    (user?.id && task.assigneeId && user.id === task.assigneeId) ||
    (user?.email && task.assigneeEmail && user.email.toLowerCase() === task.assigneeEmail.toLowerCase())
  )

  return (
    <section className="space-y-6">
      <Link href="/tasks" className="inline-flex items-center text-xs sm:text-sm font-medium text-[#0F3F7F] hover:underline">
        ← Back to tasks
      </Link>

      <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">Task Detail</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#101828]">{task.title}</h1>
            <p className="max-w-3xl text-xs sm:text-sm leading-6 text-[#64748B]">{task.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusStyles[task.status] ?? 'bg-[#F5F7FA] text-[#64748B]'}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span className="rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-semibold text-[#0F3F7F] uppercase tracking-wider">
              {task.priority}
            </span>
            {task.satisfactionRating != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
                <StarIcon className="size-3.5 fill-emerald-600 text-emerald-600" />
                Rating: {task.satisfactionRating}/10
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Assignee', task.assigneeName || 'Unassigned'],
            ['Assignee Email', task.assigneeEmail || '—'],
            ['Domain / Field', task.domain || '—'],
            ['Due Date', task.dueDate || '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#F5F7FA] p-3.5 sm:p-4">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">{label}</p>
              <p className="mt-1 truncate text-xs sm:text-sm font-medium text-[#101828]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <TaskDetailActions
        taskId={task.id}
        currentStatus={task.status}
        currentAssigneeEmail={task.assigneeEmail}
        currentPriority={task.priority}
        currentRole={currentRole}
        profiles={profiles}
        taskAssigneeId={task.assigneeId}
        taskDueDate={task.dueDate}
        currentUserId={user?.id}
        currentUserEmail={user?.email}
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Volunteer Q&A Section (Module 9) */}
          <TaskQuestions
            taskId={task.id}
            initialQuestions={task.questions || []}
            userRole={currentRole}
            currentUserId={user?.id}
            isAssignee={isAssignedToUser}
          />

          {/* Comments & Feedback Section */}
          <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-[#101828]">Comments & Feedback</h2>
              <p className="text-xs text-[#64748B]">Visible to task team</p>
            </div>

            <div className="mt-4 sm:mt-5 space-y-4">
              {task.comments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D8E0EA] bg-[#F5F7FA] p-4 text-xs sm:text-sm text-[#64748B]">
                  No comments yet. Leave a note below for the volunteer or manager.
                </div>
              ) : (
                task.comments.map((comment) => (
                  <article key={comment.id} className="rounded-2xl bg-[#F5F7FA] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-[#101828]">{comment.author}</p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#64748B]">{comment.role}</p>
                      </div>
                      <p className="text-[10px] sm:text-xs text-[#64748B]">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-2.5 text-xs sm:text-sm leading-6 text-[#475467]">{comment.content}</p>
                  </article>
                ))
              )}
            </div>

            <CommentComposer taskId={task.id} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="font-heading text-lg sm:text-xl font-semibold text-[#101828]">Task Attachments</h2>
            <div className="mt-4 space-y-3">
              {(task.attachmentDetails && task.attachmentDetails.length > 0) ? (
                task.attachmentDetails.map((att, idx) => {
                  const isLink = att.attachmentType === 'link' || att.fileUrl.includes('drive.google.com') || att.fileUrl.includes('youtube.com') || att.fileUrl.includes('youtu.be')
                  const fileName = att.fileName || `Attachment ${idx + 1}`
                  const fileType = isLink ? 'Video / Cloud Link' : getFileType(fileName)

                  return (
                    <div key={att.id || att.fileUrl || idx} className="flex items-center justify-between gap-3 rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] p-3 sm:p-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF1FF] text-[#0F3F7F]">
                          {isLink ? <ExternalLinkIcon className="size-5" /> : <FileIcon className="size-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-semibold text-[#101828]" title={fileName}>
                            {fileName}
                          </p>
                          <p className="text-[10px] sm:text-xs font-medium text-[#64748B]">
                            {fileType}
                          </p>
                        </div>
                      </div>

                      <a
                        href={att.fileUrl}
                        download={isLink ? undefined : fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F3F7F] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0b3164] shrink-0 shadow-sm"
                      >
                        {isLink ? (
                          <>
                            <ExternalLinkIcon className="size-3.5" /> Open Link
                          </>
                        ) : (
                          <>
                            <DownloadIcon className="size-3.5" /> Download
                          </>
                        )}
                      </a>
                    </div>
                  )
                })
              ) : task.attachments.length > 0 ? (
                task.attachments.map((attachment, idx) => {
                  const isUrl = attachment.startsWith('http://') || attachment.startsWith('https://')
                  const isLink = attachment.includes('drive.google.com') || attachment.includes('youtube.com') || attachment.includes('youtu.be')
                  const fileName = attachment.split('/').pop()?.split('_').slice(1).join('_') || attachment.split('/').pop() || `Attachment ${idx + 1}`
                  const fileType = isLink ? 'Video / Cloud Link' : getFileType(fileName)

                  return (
                    <div key={attachment} className="flex items-center justify-between gap-3 rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] p-3 sm:p-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF1FF] text-[#0F3F7F]">
                          {isLink ? <ExternalLinkIcon className="size-5" /> : <FileIcon className="size-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-semibold text-[#101828]" title={fileName}>
                            {fileName}
                          </p>
                          <p className="text-[10px] sm:text-xs font-medium text-[#64748B]">
                            {fileType}
                          </p>
                        </div>
                      </div>

                      {isUrl && (
                        <a
                          href={attachment}
                          download={isLink ? undefined : fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F3F7F] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0b3164] shrink-0 shadow-sm"
                        >
                          {isLink ? (
                            <>
                              <ExternalLinkIcon className="size-3.5" /> Open Link
                            </>
                          ) : (
                            <>
                              <DownloadIcon className="size-3.5" /> Download
                            </>
                          )}
                        </a>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="rounded-xl border border-dashed border-[#D8E0EA] bg-[#F5F7FA] p-4 text-center">
                  <p className="text-xs text-[#64748B]">No files uploaded for this task.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-[#0F3F7F] p-4 sm:p-6 text-white shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">Module 6 Guidance</p>
            <p className="mt-2 text-xs leading-5 text-white/85">
              Task status and volunteer assignment can be updated live using the control panel above.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
