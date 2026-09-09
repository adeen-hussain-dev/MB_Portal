'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LayoutListIcon, Columns3Icon, SearchIcon, SlidersHorizontalIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskCreateDialog } from '@/components/tasks/task-create-dialog'
import { TaskCard } from '@/components/tasks/task-card'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import type { TaskPriority, TaskRecord, TaskStatus } from '@/lib/task-store'

type Assignee = {
  id: string
  full_name: string
  email: string
  role?: string | null
  domain?: string | null
  status?: string | null
}

type CurrentUser = {
  id: string
  role: string
  full_name?: string | null
  email?: string | null
}

type TaskWorkspaceProps = {
  initialTasks: TaskRecord[]
  assignees: Assignee[]
  currentUser?: CurrentUser | null
}

const statusOptions: Array<{ value: TaskStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'done', label: 'Done' },
]

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

function matchesSearch(task: TaskRecord, query: string) {
  if (!query) return true

  const haystack = [
    task.title,
    task.description,
    task.domain,
    task.assigneeName,
    task.assigneeEmail,
    task.priority,
    task.status,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

export function TaskWorkspace({ initialTasks, assignees, currentUser }: TaskWorkspaceProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusMatches = statusFilter === 'all' ? true : task.status === statusFilter
      const assigneeMatches = assigneeFilter === 'all' ? true : task.assigneeEmail === assigneeFilter
      const searchMatches = matchesSearch(task, search)

      return statusMatches && assigneeMatches && searchMatches
    })
  }, [assigneeFilter, search, statusFilter, tasks])

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <section className="w-full min-w-0 max-w-full rounded-[2rem] border border-[#D8E0EA] bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2 min-w-0">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-[#0F3F7F]">Module 7 — Task Workspace</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-[#101828]">Kanban Board & Task Queue</h1>
            <p className="max-w-3xl text-xs sm:text-sm leading-6 text-[#64748B]">
              Organize workflow stages with the drag-and-drop Kanban board, create new tasks, and filter the operational queue in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle Switch */}
            <div className="flex items-center rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold transition-all ${
                  viewMode === 'board'
                    ? 'bg-[#0F3F7F] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#101828]'
                }`}
              >
                <Columns3Icon className="size-4" />
                Kanban Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#0F3F7F] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#101828]'
                }`}
              >
                <LayoutListIcon className="size-4" />
                List View
              </button>
            </div>

            {currentUser?.role !== 'volunteer' && (
              <TaskCreateDialog
                assignees={assignees}
                onCreated={(task) => setTasks((current) => [task as TaskRecord, ...current])}
              />
            )}
          </div>
        </div>

        <div className={`mt-6 grid grid-cols-1 gap-3 ${currentUser?.role === 'volunteer' ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3'}`}>
          <label className="relative min-w-0">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, domain, status..."
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] pl-9 pr-4 text-xs sm:text-sm"
            />
          </label>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}>
            <SelectTrigger className="h-11 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4 text-xs sm:text-sm">
              <SlidersHorizontalIcon className="size-4 text-[#64748B]" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentUser?.role !== 'volunteer' && (
            <Select value={assigneeFilter} onValueChange={(value) => setAssigneeFilter(value ?? 'all')}>
              <SelectTrigger className="h-11 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4 text-xs sm:text-sm">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.email} value={assignee.email}>
                    {assignee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      {/* Content Rendering: Board View vs List View */}
      {viewMode === 'board' ? (
        <section className="w-full min-w-0 max-w-full space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Showing {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'} across workflow
            </p>
            <p className="text-xs text-[#64748B]">
              <span className="font-medium text-[#0F3F7F]">Tip:</span> Drag and drop cards across To do, In progress, and In review. Use the Review action for Done / Changes Requested.
            </p>
          </div>

          <KanbanBoard
            tasks={filteredTasks}
            currentUser={currentUser}
            onTaskUpdated={(updated) => {
              setTasks((cur) => cur.map((t) => (t.id === updated.id ? updated : t)))
            }}
          />
        </section>
      ) : (
        <section className="w-full min-w-0 max-w-full grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-auto">
            {filteredTasks.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[#D8E0EA] bg-white p-10 text-center shadow-sm">
                <p className="font-heading text-2xl font-semibold text-[#101828]">No tasks match your filters</p>
                <p className="mt-2 text-sm text-[#64748B]">Try another search term or clear the filters to see more results.</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  title={task.title}
                  description={task.description}
                  assigneeName={task.assigneeName}
                  assigneeEmail={task.assigneeEmail}
                  domain={task.domain}
                  dueDate={task.dueDate}
                  status={task.status}
                  priority={task.priority}
                  attachmentCount={task.attachments.length}
                />
              ))
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-[#D8E0EA] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0F3F7F]">Task summary</p>
              <div className="mt-4 space-y-3 text-sm text-[#64748B]">
                {statusOptions
                  .filter((option) => option.value !== 'all')
                  .map((option) => {
                    const count = tasks.filter((task) => task.status === option.value).length

                    return (
                      <div key={option.value} className="flex items-center justify-between rounded-xl bg-[#F5F7FA] px-4 py-3">
                        <span>{option.label}</span>
                        <span className="font-semibold text-[#101828]">{count}</span>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#D8E0EA] bg-[#0F3F7F] p-5 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">Search tip</p>
              <p className="mt-3 text-sm leading-6 text-white/85">
                Search scans title, description, domain, status, priority, and assignee so the queue stays easy to
                navigate as it grows.
              </p>
            </div>
          </aside>
        </section>
      )}
    </div>
  )
}
