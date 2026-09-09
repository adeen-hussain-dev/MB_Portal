export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'changes_requested'

export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskComment = {
  id: string
  author: string
  role: 'admin' | 'manager' | 'volunteer'
  content: string
  createdAt: string
}

export type TaskAttachmentDetail = {
  id?: string
  fileName: string
  fileUrl: string
  attachmentType: 'file' | 'link'
}

export type TaskQuestion = {
  id: string
  taskId: string
  askedBy: string
  askedByName?: string
  askedByRole?: string
  question: string
  answeredBy?: string | null
  answeredByName?: string | null
  answer?: string | null
  status: 'open' | 'answered'
  createdAt: string
  answeredAt?: string | null
}

export type TaskRecord = {
  id: string
  title: string
  description: string
  domain: string
  assigneeId?: string | null
  assigneeName: string
  assigneeEmail: string
  priority: TaskPriority
  dueDate: string
  status: TaskStatus
  createdAt: string
  attachments: string[]
  attachmentDetails?: TaskAttachmentDetail[]
  satisfactionRating?: number | null
  comments: TaskComment[]
  questions: TaskQuestion[]
}

export type TaskAttachmentInput =
  | string
  | {
      fileName: string
      fileUrl: string
      attachmentType: 'file' | 'link'
    }

export type TaskInput = {
  title: string
  description: string
  domain: string
  assigneeId?: string
  assigneeName: string
  assigneeEmail: string
  priority: TaskPriority
  dueDate: string
  createdBy?: string
  attachmentName?: string
  attachments?: TaskAttachmentInput[]
}

export type TaskRow = {
  id: string
  title?: string | null
  description?: string | null
  domain?: string | null
  assignee_id?: string | null
  created_by?: string | null
  assignee_name?: string | null
  assignee_email?: string | null
  priority?: TaskPriority | null
  due_date?: string | null
  status?: TaskStatus | null
  satisfaction_rating?: number | null
  created_at?: string | null
  attachments?: string[] | null
  profiles?: { full_name?: string | null; email?: string | null } | null
  assignee?: { full_name?: string | null; email?: string | null } | null
  task_attachments?: Array<{
    id?: string
    file_url?: string | null
    file_name?: string | null
    attachment_type?: string | null
  }> | null
}

export function mapTaskRow(row: TaskRow & Record<string, unknown>): TaskRecord {
  const profileInfo = (row.profiles || row.assignee) as { full_name?: string; email?: string } | null
  const assigneeName = row.assignee_name || profileInfo?.full_name || row.owner as string || ''
  const assigneeEmail = row.assignee_email || profileInfo?.email || row.owner as string || ''

  let attachmentsList: string[] = []
  const attachmentDetails: TaskAttachmentDetail[] = []

  if (Array.isArray(row.task_attachments) && row.task_attachments.length > 0) {
    for (const a of row.task_attachments) {
      const url = String(a.file_url || '')
      const name = String(a.file_name || url.split('/').pop() || 'Attachment')
      const type = (a.attachment_type === 'link' || (!a.attachment_type && (url.includes('drive.google.com') || url.includes('youtube.com') || url.includes('youtu.be'))))
        ? 'link'
        : 'file'
      if (url) {
        attachmentsList.push(url)
        attachmentDetails.push({
          id: a.id,
          fileName: name,
          fileUrl: url,
          attachmentType: type,
        })
      }
    }
  } else if (Array.isArray(row.attachments)) {
    attachmentsList = row.attachments.map(String)
    for (const url of attachmentsList) {
      const isLink = url.includes('drive.google.com') || url.includes('youtube.com') || url.includes('youtu.be')
      attachmentDetails.push({
        fileName: url.split('/').pop() || 'Attachment',
        fileUrl: url,
        attachmentType: isLink ? 'link' : 'file',
      })
    }
  }

  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    domain: row.domain ?? '',
    assigneeId: row.assignee_id || null,
    assigneeName,
    assigneeEmail,
    priority: (row.priority ?? 'medium') as TaskPriority,
    dueDate: row.due_date ?? '',
    status: (row.status ?? 'todo') as TaskStatus,
    satisfactionRating: row.satisfaction_rating != null ? Number(row.satisfaction_rating) : null,
    createdAt: row.created_at ?? new Date().toISOString(),
    attachments: attachmentsList,
    attachmentDetails,
    comments: [],
    questions: [],
  }
}

