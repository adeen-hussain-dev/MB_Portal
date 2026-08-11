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
  const [tasks, profilesResult] = await Promise.all([
    fetchTasks(),
    supabase.from('profiles').select('id, full_name, email, role, domain, status').order('created_at'),
  ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  const assignees = (profilesResult.data ?? []).filter((profile: Assignee) => profile.email)

  return (
    <TaskWorkspace initialTasks={tasks} assignees={assignees} />
  )
}
