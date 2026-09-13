import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchProfiles, fetchTaskById } from '@/lib/portal-data'
import { createClient } from '@/lib/supabase/server'
import { CommentComposer } from '@/components/tasks/comment-composer'
import { TaskDetailActions } from '@/components/tasks/task-detail-actions'
import { TaskQuestions } from '@/components/tasks/task-questions'
import { TaskSubmissionUpload } from '@/components/tasks/task-submission-upload'
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

  const allAttachments = task.attachmentDetails || []
  const referenceMaterials = allAttachments.filter(
    (a) => a.purpose === 'reference' || !a.purpose
  )
  const submittedWork = allAttachments.filter(
    (a) => a.purpose === 'submission'
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
        submissionCount={submittedWork.length}
        task={task}
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Volunteer Q&A Section (Module 9) */}
          <TaskQuestions
            taskId={task.id}
            initialQuestions={task.questions || []}
            userRole={currentRole}
            currentUserId={user?.id}
            isAssignee={isAssignedToUser}
            taskStatus={task.status}
          />

          {/* Comments & Feedback Section */}
          <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-[#101828]">Comments & Feedback</h2>
              <p className="text-xs text-[#64748B]">Visible to task team</p>
            </div>

            <div className="mt-4 sm:mt-5 space-y-4">
              {task.comments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D8E0EA] bg-[#F5F7FA] p-6 text-center">
                  <p className="text-xs text-[#64748B]">No comments yet. Start the conversation!</p>
                </div>
              ) : (
                task.comments.map((comment) => (
                  <article key={comment.id} className="rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] p-3.5 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-[#101828]">{comment.author}</span>
                        <span className="rounded-full bg-[#EAF1FF] px-2 py-0.5 text-[10px] font-semibold text-[#0F3F7F]">
                          {comment.role}
                        </span>
                      </div>
                      <time className="text-[10px] text-[#64748B]">
                        {new Date(comment.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <p className="mt-2.5 text-xs sm:text-sm leading-6 text-[#475467]">{comment.content}</p>
                  </article>
                ))
              )}
            </div>

            <CommentComposer taskId={task.id} />
          </div>
        </div>

        <aside className="space-y-6">
          {/* SECTION 1: Submitted Work (purpose = 'submission') */}
          <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-[#101828]">Submitted Work</h2>
                <p className="text-xs text-[#64748B]">Deliverables submitted by volunteer</p>
              </div>
              <span className="rounded-full bg-[#EAF1FF] px-2.5 py-0.5 text-xs font-semibold text-[#0F3F7F]">
                {submittedWork.length} {submittedWork.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            <div className="space-y-3">
              {submittedWork.length > 0 ? (
                submittedWork.map((att, idx) => {
                  const isLink = att.attachmentType === 'link' || att.fileUrl.includes('drive.google.com') || att.fileUrl.includes('youtube.com') || att.fileUrl.includes('youtu.be')
                  const fileName = att.fileName || `Submission ${idx + 1}`
                  const fileType = isLink ? 'Video / Cloud Link' : getFileType(fileName)

                  return (
                    <div key={att.id || att.fileUrl || idx} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 sm:p-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                          {isLink ? <ExternalLinkIcon className="size-5" /> : <FileIcon className="size-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-semibold text-[#101828]" title={fileName}>
                            {fileName}
                          </p>
                          <p className="text-[10px] sm:text-xs font-medium text-emerald-700">
                            {fileType} {att.createdAt ? `• ${new Date(att.createdAt).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                      </div>

                      <a
                        href={att.fileUrl}
                        download={isLink ? undefined : fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 shrink-0 shadow-sm"
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
              ) : (
                <div className="rounded-xl border border-dashed border-[#D8E0EA] bg-[#F5F7FA] p-4 text-center">
                  <p className="text-xs text-[#64748B]">No submissions uploaded yet.</p>
                  <p className="mt-1 text-[11px] text-[#94A3B8]">
                    At least one submission is required before this task can be moved to review.
                  </p>
                </div>
              )}
            </div>

            {/* Volunteer submission upload control */}
            {(isAssignedToUser || isAdminOrManager) && task.status !== 'done' && (
              <div className="pt-2 border-t border-[#E2E8F0]">
                <TaskSubmissionUpload taskId={task.id} />
              </div>
            )}
          </div>

          {/* SECTION 2: Reference Materials (purpose = 'reference') */}
          <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-[#101828]">Reference Materials</h2>
                <p className="text-xs text-[#64748B]">Briefs, templates & supporting files</p>
              </div>
              <span className="rounded-full bg-[#F5F7FA] border border-[#D8E0EA] px-2.5 py-0.5 text-xs font-semibold text-[#64748B]">
                {referenceMaterials.length > 0 ? referenceMaterials.length : task.attachments.length}
              </span>
            </div>

            <div className="space-y-3">
              {referenceMaterials.length > 0 ? (
                referenceMaterials.map((att, idx) => {
                  const isLink = att.attachmentType === 'link' || att.fileUrl.includes('drive.google.com') || att.fileUrl.includes('youtube.com') || att.fileUrl.includes('youtu.be')
                  const fileName = att.fileName || `Reference ${idx + 1}`
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
                  const fileName = attachment.split('/').pop()?.split('_').slice(1).join('_') || attachment.split('/').pop() || `Reference ${idx + 1}`
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
                  <p className="text-xs text-[#64748B]">No reference materials for this task.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-[#0F3F7F] p-4 sm:p-6 text-white shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">Submission Workflow</p>
            <p className="mt-2 text-xs leading-5 text-white/85">
              Assigned volunteers must upload at least one submission file or link before submitting a task for review.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
