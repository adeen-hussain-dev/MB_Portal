import { createClient } from '@/lib/supabase/server'
import { TaskWorkspace } from '@/components/tasks/task-workspace'
import { fetchTasks } from '@/lib/portal-data'

type Assignee = {
  id: string
  full_name: string
  email: string
  role?: string | null
  domain?: string | null
  status?: string | null
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [tasks, profilesResult, currentUserResult] = await Promise.all([
    fetchTasks(),
    supabase.from('profiles').select('id, full_name, email, role, domain, status').order('created_at'),
    user ? supabase.from('profiles').select('id, full_name, email, role').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  const currentUser = currentUserResult.data ? {
    id: currentUserResult.data.id,
    full_name: currentUserResult.data.full_name,
    email: currentUserResult.data.email,
    role: (currentUserResult.data.role || 'volunteer') as string,
  } : null

  const isVolunteer = currentUser?.role === 'volunteer'
  const assignees = isVolunteer
    ? []
    : (profilesResult.data ?? []).filter((profile: Assignee) => profile.email)

  return (
    <TaskWorkspace initialTasks={tasks} assignees={assignees} currentUser={currentUser} />
  )
}
