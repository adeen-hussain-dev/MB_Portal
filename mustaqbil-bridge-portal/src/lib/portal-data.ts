import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { mapTaskRow, type TaskInput, type TaskRecord, type TaskRow, type TaskComment, type TaskStatus, type TaskPriority, type TaskAttachmentDetail, type TaskQuestion } from '@/lib/task-store'
import { fetchPastWinners, type PastWinner } from '@/lib/monthly-winners'

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

export type VolunteerOverviewData = {
  statusCounts: Record<TaskStatus, number>
  upcomingTasks: TaskRecord[]
  totalAssigned: number
}

export type VolunteerScore = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  completed: number
  onTime: number
  rejections: number
  avgRating?: number
  score: number
}

export type AdminOverviewData = {
  statusCounts: Record<TaskStatus, number>
  totalTasks: number
  totalVolunteers: number
  leaderboard: VolunteerScore[]
  completedPerVolunteer: Array<{ name: string; completed: number }>
  pastWinners: PastWinner[]
}

export async function fetchTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVolunteer = profile?.role === 'volunteer'

  let tasksQuery = supabase
    .from('tasks')
    .select('*, profiles!tasks_assignee_id_fkey(id, full_name, email)')
    .order('created_at', { ascending: false })

  if (isVolunteer) {
    tasksQuery = tasksQuery.eq('assignee_id', user.id)
  }

  const { data: rawTasks, error: tasksError } = await tasksQuery

  if (tasksError || !rawTasks) {
    console.error('fetchTasks error:', tasksError?.message)
    return []
  }

  const taskIds = rawTasks.map((t) => t.id)
  const attachmentMap: Record<string, string[]> = {}

  if (taskIds.length > 0) {
    const { data: rawAttachments, error: attError } = await supabase
      .from('task_attachments')
      .select('*')
      .in('task_id', taskIds)

    if (attError) {
      console.error('Error fetching task attachments:', attError.message)
    }

    for (const att of rawAttachments ?? []) {
      if (att.task_id) {
        if (!attachmentMap[att.task_id]) attachmentMap[att.task_id] = []
        const urlOrName = att.file_url || att.file_name
        if (urlOrName) attachmentMap[att.task_id].push(urlOrName)
      }
    }
  }

  return rawTasks.map((row) => {
    const mapped = mapTaskRow(row as TaskRow & Record<string, unknown>)
    if (attachmentMap[row.id] && attachmentMap[row.id].length > 0) {
      mapped.attachments = Array.from(new Set([...attachmentMap[row.id], ...mapped.attachments]))
    }
    return mapped
  })
}

export async function fetchTaskById(id: string) {
  const supabase = await createClient()
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) return null

  let profile = null
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userProfile) {
    profile = userProfile
  } else {
    const admin = createAdminClient()
    const { data: adminProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    profile = adminProfile
  }

  const isVolunteer = profile?.role === 'volunteer'

  let query = supabase
    .from('tasks')
    .select('*, profiles!tasks_assignee_id_fkey(id, full_name, email)')
    .eq('id', id)

  if (isVolunteer) {
    query = query.eq('assignee_id', user.id)
  }

  let taskRow = null
  const { data: userTaskRow } = await query.maybeSingle()
  if (userTaskRow) {
    taskRow = userTaskRow
  } else {
    const admin = createAdminClient()
    let adminQuery = admin
      .from('tasks')
      .select('*, profiles!tasks_assignee_id_fkey(id, full_name, email)')
      .eq('id', id)
    if (isVolunteer) {
      adminQuery = adminQuery.eq('assignee_id', user.id)
    }
    const { data: adminTaskRow } = await adminQuery.maybeSingle()
    taskRow = adminTaskRow
  }

  if (!taskRow) return null

  const [commentsResult, attachmentsResult, questionsResult] = await Promise.all([
    supabase
      .from('task_comments')
      .select('*, profiles!task_comments_user_id_fkey(full_name, role)')
      .eq('task_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('task_attachments').select('*').eq('task_id', id),
    supabase
      .from('task_questions')
      .select('*, asked:profiles!task_questions_asked_by_fkey(full_name, role), answered:profiles!task_questions_answered_by_fkey(full_name, role)')
      .eq('task_id', id)
      .order('created_at', { ascending: true }),
  ])

  let rawAttachments = ensureArray(attachmentsResult.data) as Array<{
    id?: string
    file_url?: string
    file_name?: string
    attachment_type?: string
  }>

  if (rawAttachments.length === 0) {
    const admin = createAdminClient()
    const { data: adminAttachments } = await admin.from('task_attachments').select('*').eq('task_id', id)
    if (adminAttachments && adminAttachments.length > 0) {
      rawAttachments = adminAttachments as typeof rawAttachments
    }
  }

  let rawQuestions = ensureArray(questionsResult.data) as Record<string, unknown>[]
  if (rawQuestions.length === 0) {
    const admin = createAdminClient()
    let adminQQuery = admin
      .from('task_questions')
      .select('*, asked:profiles!task_questions_asked_by_fkey(full_name, role), answered:profiles!task_questions_answered_by_fkey(full_name, role)')
      .eq('task_id', id)
      .order('created_at', { ascending: true })
    if (isVolunteer) {
      adminQQuery = adminQQuery.eq('asked_by', user.id)
    }
    const { data: adminQData } = await adminQQuery
    if (adminQData && adminQData.length > 0) {
      rawQuestions = adminQData as typeof rawQuestions
    }
  }

  const rawComments = ensureArray(commentsResult.data) as Record<string, unknown>[]

  const mappedComments: TaskComment[] = rawComments.map((c) => {
    const p = c.profiles as { full_name?: string; role?: string } | undefined
    return {
      id: String(c.id ?? `${Date.now()}`),
      author: String(c.author_name ?? p?.full_name ?? c.author ?? 'Team Member'),
      role: (p?.role ?? c.author_role ?? c.role ?? 'volunteer') as TaskComment['role'],
      content: String(c.comment ?? c.content ?? ''),
      createdAt: String(c.created_at ?? new Date().toISOString()),
    }
  })

  // Collect any missing profile IDs for answered_by or asked_by (e.g. if RLS restricted volunteer from selecting manager's profile)
  const missingProfileIds = new Set<string>()
  for (const q of rawQuestions) {
    if (q.answered_by && !(q.answered as { full_name?: string })?.full_name) {
      missingProfileIds.add(String(q.answered_by))
    }
    if (q.asked_by && !(q.asked as { full_name?: string })?.full_name) {
      missingProfileIds.add(String(q.asked_by))
    }
  }

  const profileMap: Record<string, { full_name: string; role: string }> = {}
  if (missingProfileIds.size > 0) {
    const admin = createAdminClient()
    const { data: missingProfiles } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .in('id', Array.from(missingProfileIds))
    if (missingProfiles) {
      for (const p of missingProfiles) {
        profileMap[p.id] = { full_name: p.full_name, role: p.role }
      }
    }
  }

  const mappedQuestions: TaskQuestion[] = rawQuestions.map((q) => {
    const asked = (q.asked as { full_name?: string; role?: string } | undefined)?.full_name
      ? (q.asked as { full_name?: string; role?: string })
      : (q.asked_by ? profileMap[String(q.asked_by)] : undefined)

    const answered = (q.answered as { full_name?: string; role?: string } | undefined)?.full_name
      ? (q.answered as { full_name?: string; role?: string })
      : (q.answered_by ? profileMap[String(q.answered_by)] : undefined)

    return {
      id: String(q.id),
      taskId: String(q.task_id),
      askedBy: String(q.asked_by),
      askedByName: String(asked?.full_name || 'Volunteer'),
      askedByRole: String(asked?.role || 'volunteer'),
      question: String(q.question || ''),
      answeredBy: q.answered_by ? String(q.answered_by) : null,
      answeredByName: answered?.full_name ? String(answered.full_name) : null,
      answer: q.answer ? String(q.answer) : null,
      status: (q.status === 'answered' ? 'answered' : 'open') as 'open' | 'answered',
      createdAt: String(q.created_at ?? new Date().toISOString()),
      answeredAt: q.answered_at ? String(q.answered_at) : null,
    }
  })

  const mappedAttachmentDetails: TaskAttachmentDetail[] = rawAttachments.map((a) => {
    const url = String(a.file_url || '')
    const name = String(a.file_name || url.split('/').pop() || 'Attachment')
    const type = (a.attachment_type === 'link' || (!a.attachment_type && (url.includes('drive.google.com') || url.includes('youtube.com') || url.includes('youtu.be'))))
      ? 'link'
      : 'file'
    return {
      id: a.id,
      fileName: name,
      fileUrl: url,
      attachmentType: type,
    }
  })

  const dbAttachments = rawAttachments.map((a) => a.file_url || a.file_name || '').filter(Boolean)
  const mappedTask = mapTaskRow(taskRow as TaskRow & Record<string, unknown>)
  const combinedAttachments = Array.from(new Set([...dbAttachments, ...mappedTask.attachments]))
  const combinedDetails = mappedAttachmentDetails.length > 0 ? mappedAttachmentDetails : (mappedTask.attachmentDetails || [])

  return {
    ...mappedTask,
    attachments: combinedAttachments,
    attachmentDetails: combinedDetails,
    comments: mappedComments,
    questions: mappedQuestions,
  }
}

export async function fetchProfiles() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isVolunteer = profile?.role === 'volunteer'

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (isVolunteer) {
    query = query.eq('id', user.id)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return (data ?? []) as ProfileRecord[]
}

export async function fetchVolunteerOverview(userId: string): Promise<VolunteerOverviewData> {
  const supabase = await createClient()

  const { data: rawTasks, error } = await supabase
    .from('tasks')
    .select('*, profiles!tasks_assignee_id_fkey(id, full_name, email)')
    .eq('assignee_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const tasks = (rawTasks ?? []).map((t) => mapTaskRow(t as TaskRow & Record<string, unknown>))

  const statusCounts: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    changes_requested: 0,
    done: 0,
  }

  for (const t of tasks) {
    if (statusCounts[t.status] !== undefined) {
      statusCounts[t.status]++
    }
  }

  const upcomingTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
    .slice(0, 5)

  return {
    statusCounts,
    upcomingTasks,
    totalAssigned: tasks.length,
  }
}

export async function fetchAdminOverview(): Promise<AdminOverviewData> {
  const supabase = await createClient()

  // 1. All tasks counts
  let tasksList: Array<{
    id: string
    title: string
    status: string
    assignee_id: string | null
    due_date: string | null
    approved_at: string | null
    approved_by: string | null
    satisfaction_rating?: number | null
  }> = []

  const { data: tasksWithRating, error: ratingError } = await supabase
    .from('tasks')
    .select('id, title, status, assignee_id, due_date, approved_at, approved_by, satisfaction_rating')

  if (ratingError) {
    const { data: tasksFallback, error: fallbackError } = await supabase
      .from('tasks')
      .select('id, title, status, assignee_id, due_date, approved_at, approved_by')
    if (fallbackError) throw new Error(fallbackError.message)
    tasksList = tasksFallback ?? []
  } else {
    tasksList = tasksWithRating ?? []
  }

  const statusCounts: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    changes_requested: 0,
    done: 0,
  }

  for (const t of tasksList) {
    const s = t.status as TaskStatus
    if (statusCounts[s] !== undefined) {
      statusCounts[s]++
    }
  }

  // 2. Volunteers list
  const { data: volunteers, error: volError } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('role', 'volunteer')

  if (volError) throw new Error(volError.message)

  const volunteerList = volunteers ?? []

  // 3. Activity log for rejections this month
  const now = new Date()
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const { data: activityLogs } = await supabase
    .from('activity_log')
    .select('task_id, new_value, created_at')
    .eq('new_value', 'changes_requested')
    .gte('created_at', currentMonthStart)

  const rejectionsByTaskId = new Map<string, number>()
  for (const log of activityLogs ?? []) {
    if (log.task_id) {
      rejectionsByTaskId.set(log.task_id, (rejectionsByTaskId.get(log.task_id) ?? 0) + 1)
    }
  }

  // Map task id to assignee id
  const taskAssigneeMap = new Map<string, string>()
  for (const t of tasksList) {
    if (t.assignee_id) {
      taskAssigneeMap.set(t.id, t.assignee_id)
    }
  }

  // Count rejections per volunteer
  const rejectionsByVolunteerId = new Map<string, number>()
  rejectionsByTaskId.forEach((count, taskId) => {
    const volunteerId = taskAssigneeMap.get(taskId)
    if (volunteerId) {
      rejectionsByVolunteerId.set(volunteerId, (rejectionsByVolunteerId.get(volunteerId) ?? 0) + count)
    }
  })

  // 4. Calculate score for each volunteer
  // Formula:
  // completed = tasks with status = 'done' AND approved_at in current calendar month
  // on_time = subset of completed where approved_at <= due_date (if due_date is null, count as on_time)
  // rejections = count of times one of their tasks was moved to 'changes_requested' this month
  // score = (completed * 10) + (on_time * 5) - (rejections * 5)
  const currentMonth = now.getUTCMonth()
  const currentYear = now.getUTCFullYear()

  const volunteerScores: VolunteerScore[] = volunteerList.map((vol) => {
    const volTasks = tasksList.filter((t) => t.assignee_id === vol.id)

    const completedTasks = volTasks.filter((t) => {
      if (t.status !== 'done' || !t.approved_at) return false
      const approvedDate = new Date(t.approved_at)
      return approvedDate.getUTCMonth() === currentMonth && approvedDate.getUTCFullYear() === currentYear
    })

    const completed = completedTasks.length

    const onTime = completedTasks.filter((t) => {
      if (!t.due_date) return true
      const approvedDate = new Date(t.approved_at as string)
      const dueDate = new Date(t.due_date)
      dueDate.setUTCHours(23, 59, 59, 999)
      return approvedDate.getTime() <= dueDate.getTime()
    }).length

    const rejections = rejectionsByVolunteerId.get(vol.id) ?? 0

    const ratedTasks = completedTasks.filter((t) => t.satisfaction_rating != null && !isNaN(Number(t.satisfaction_rating)))
    const avgRating = ratedTasks.length > 0
      ? ratedTasks.reduce((sum, t) => sum + Number(t.satisfaction_rating), 0) / ratedTasks.length
      : 0

    // Leaderboard formula (§12C / §13):
    // score = (completed * 10) + (on_time * 5) - (rejections * 5) + (avg_rating * 3)
    const score = Math.round((completed * 10) + (onTime * 5) - (rejections * 5) + (avgRating * 3))

    return {
      id: vol.id,
      name: vol.full_name || vol.email || 'Volunteer',
      email: vol.email || '',
      avatarUrl: vol.avatar_url,
      completed,
      onTime,
      rejections,
      avgRating: Number(avgRating.toFixed(1)),
      score,
    }
  })

  // Rank by score descending; tie-break by higher completed
  volunteerScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.completed - a.completed
  })

  const leaderboard = volunteerScores.slice(0, 3)

  const completedPerVolunteer = volunteerScores.map((v) => ({
    name: v.name.split(' ')[0], // first name for clean bar chart
    completed: v.completed,
  }))

  const pastWinners = await fetchPastWinners()

  return {
    statusCounts,
    totalTasks: tasksList.length,
    totalVolunteers: volunteerList.length,
    leaderboard,
    completedPerVolunteer,
    pastWinners,
  }
}

export async function fetchDashboardSummary() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      openTasks: 0,
      volunteers: 0,
      comments: 0,
      inReview: 0,
      done: 0,
    }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isVolunteer = profile?.role === 'volunteer'

  let tasksQuery = supabase.from('tasks').select('id, status')
  if (isVolunteer) {
    tasksQuery = tasksQuery.eq('assignee_id', user.id)
  }

  const [tasksRes, profilesRes, commentsRes] = await Promise.all([
    tasksQuery,
    isVolunteer ? Promise.resolve({ data: [] }) : supabase.from('profiles').select('id').eq('role', 'volunteer'),
    supabase.from('task_comments').select('id'),
  ])

  const tasks = tasksRes.data ?? []
  const volunteers = profilesRes.data ?? []
  const comments = commentsRes.data ?? []

  return {
    openTasks: tasks.filter((t) => t.status !== 'done').length,
    volunteers: volunteers.length,
    comments: comments.length,
    inReview: tasks.filter((t) => t.status === 'in_review').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }
}

export async function createTask(input: TaskInput) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description,
      domain: input.domain,
      assignee_id: input.assigneeId,
      created_by: input.createdBy,
      priority: input.priority,
      due_date: input.dueDate || null,
      status: 'todo',
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const taskId = data.id

  if (Array.isArray(input.attachments) && input.attachments.length > 0 && taskId) {
    for (const item of input.attachments) {
      const isObj = typeof item === 'object' && item !== null
      const fileUrl = isObj ? item.fileUrl : String(item)
      const fileName = isObj ? item.fileName : (fileUrl.split('/').pop() || 'attachment')
      const isLink = fileUrl.includes('drive.google.com') || fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be')
      const attachmentType = isObj ? item.attachmentType : (isLink ? 'link' : 'file')

      // Insert with attachment_type, fallback without if column not migrated yet
      try {
        const { error: attInsertError } = await admin.from('task_attachments').insert({
          task_id: taskId,
          file_url: fileUrl,
          file_name: fileName,
          attachment_type: attachmentType,
          uploaded_by: input.createdBy,
        })
        if (attInsertError) {
          if (attInsertError.message.includes('attachment_type')) {
            await admin.from('task_attachments').insert({
              task_id: taskId,
              file_url: fileUrl,
              file_name: fileName,
              uploaded_by: input.createdBy,
            })
          } else {
            console.error('task_attachments insert error:', attInsertError.message)
          }
        }
      } catch (insertErr) {
        console.error('task_attachments insert catch:', insertErr)
      }
    }
  }

  return mapTaskRow({
    ...(data as TaskRow & Record<string, unknown>),
    assignee_name: input.assigneeName,
    assignee_email: input.assigneeEmail,
    attachments: input.attachments ? input.attachments.map(a => typeof a === 'object' && a !== null ? a.fileUrl : String(a)) : [],
  })
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
