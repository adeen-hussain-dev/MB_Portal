import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapTaskRow, type TaskInput, type TaskRecord, type TaskRow, type TaskComment, type TaskStatus } from '@/lib/task-store'

export type ProfileRecord = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  domain: string | null
  status: string | null
  avatar_url: string | null
}

export type DashboardSummary = {
  openTasks: number
  volunteers: number
  comments: number
  inReview: number
  done: number
}

function ensureArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function mapCommentRow(row: Record<string, unknown>): TaskComment {
  return {
    id: String(row.id ?? `${Date.now()}`),
    author: String(row.author_name ?? row.author ?? 'Unknown'),
    role: (row.author_role ?? row.role ?? 'volunteer') as TaskComment['role'],
    content: String(row.content ?? row.comment ?? row.question ?? ''),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  }
}

export function mapTaskRowWithComments(row: TaskRow & Record<string, unknown>, comments: Record<string, unknown>[] = []): TaskRecord {
  return {
    ...mapTaskRow(row),
    comments: comments.map(mapCommentRow),
  }
}

export async function fetchTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => mapTaskRow(row as TaskRow & Record<string, unknown>))
}

export async function fetchTaskById(id: string) {
  const supabase = await createClient()
  const [taskResult, commentsResult] = await Promise.all([
    supabase.from('tasks').select('*').eq('id', id).maybeSingle(),
    supabase.from('task_comments').select('*').eq('task_id', id).order('created_at', { ascending: true }),
  ])

  if (taskResult.error) throw new Error(taskResult.error.message)
  if (commentsResult.error) throw new Error(commentsResult.error.message)

  if (!taskResult.data) return null

  return mapTaskRowWithComments(taskResult.data as TaskRow & Record<string, unknown>, ensureArray(commentsResult.data) as Record<string, unknown>[])
}

export async function fetchProfiles() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []) as ProfileRecord[]
}

export async function fetchDashboardSummary() {
  const supabase = await createClient()

  const [tasksResult, profilesResult, commentsResult] = await Promise.all([
    supabase.from('tasks').select('id, status'),
    supabase.from('profiles').select('id, role'),
    supabase.from('task_comments').select('id'),
  ])

  if (tasksResult.error) throw new Error(tasksResult.error.message)
  if (profilesResult.error) throw new Error(profilesResult.error.message)
  if (commentsResult.error) throw new Error(commentsResult.error.message)

  const tasks = ensureArray(tasksResult.data) as Array<{ status?: TaskStatus | null }>
  const profiles = ensureArray(profilesResult.data) as Array<{ role?: string | null }>
  const comments = ensureArray(commentsResult.data)

  return {
    openTasks: tasks.filter((task) => task.status !== 'done').length,
    volunteers: profiles.length,
    comments: comments.length,
    inReview: tasks.filter((task) => task.status === 'in_review').length,
    done: tasks.filter((task) => task.status === 'done').length,
  } satisfies DashboardSummary
}

export async function createTask(input: TaskInput) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description,
      domain: input.domain,
      assignee_name: input.assigneeName,
      assignee_email: input.assigneeEmail,
      priority: input.priority,
      due_date: input.dueDate,
      status: 'todo',
      attachments: input.attachments ?? (input.attachmentName ? [input.attachmentName] : []),
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  return mapTaskRow(data as TaskRow & Record<string, unknown>)
}

export async function updateTask(id: string, patch: Partial<TaskRow & Record<string, unknown>>) {
  const admin = createAdminClient()
  const { data, error } = await admin.from('tasks').update(patch).eq('id', id).select('*').single()

  if (error) throw new Error(error.message)

  return mapTaskRow(data as TaskRow & Record<string, unknown>)
}

export async function deleteTask(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('tasks').delete().eq('id', id)

  if (error) throw new Error(error.message)
}
