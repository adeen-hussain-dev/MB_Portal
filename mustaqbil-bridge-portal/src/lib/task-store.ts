export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'changes_requested'

export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskComment = {
  id: string
  author: string
  role: 'admin' | 'manager' | 'volunteer'
  content: string
  createdAt: string
}

export type TaskRecord = {
  id: string
  title: string
  description: string
  domain: string
  assigneeName: string
  assigneeEmail: string
  priority: TaskPriority
  dueDate: string
  status: TaskStatus
  createdAt: string
  attachments: string[]
  comments: TaskComment[]
}

export type TaskInput = {
  title: string
  description: string
  domain: string
  assigneeName: string
  assigneeEmail: string
  priority: TaskPriority
  dueDate: string
  attachmentName?: string
}

export type TaskRow = {
  id: string
  title?: string | null
  description?: string | null
  domain?: string | null
  assignee_name?: string | null
  assignee_email?: string | null
  priority?: TaskPriority | null
  due_date?: string | null
  status?: TaskStatus | null
  created_at?: string | null
  attachments?: string[] | null
}

export function mapTaskRow(row: TaskRow & Record<string, unknown>): TaskRecord {
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    domain: row.domain ?? '',
    assigneeName: row.assignee_name ?? '',
    assigneeEmail: row.assignee_email ?? '',
    priority: (row.priority ?? 'medium') as TaskPriority,
    dueDate: row.due_date ?? '',
    status: (row.status ?? 'todo') as TaskStatus,
    createdAt: row.created_at ?? new Date().toISOString(),
    attachments: Array.isArray(row.attachments) ? row.attachments.map(String) : [],
    comments: [],
  }
}

