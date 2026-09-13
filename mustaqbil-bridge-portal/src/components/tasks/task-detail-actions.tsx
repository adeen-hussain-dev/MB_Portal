'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TaskPriority, TaskRecord, TaskStatus } from '@/lib/task-store'
import { CheckIcon, CheckCircle2Icon, ClipboardCheckIcon, LockIcon, RefreshCwIcon } from 'lucide-react'
import { TaskReviewModal } from './task-review-modal'

import { isTaskPastDuePkt } from '@/lib/date-utils'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role?: string | null
}

type TaskDetailActionsProps = {
  taskId: string
  currentStatus: TaskStatus
  currentAssigneeEmail: string
  currentPriority: TaskPriority
  currentRole: string
  profiles: Profile[]
  taskAssigneeId?: string | null
  taskDueDate?: string | null
  currentUserId?: string | null
  currentUserEmail?: string | null
  submissionCount?: number
  task?: TaskRecord
}

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
]

const statusLabels: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  changes_requested: 'Changes requested',
  done: 'Done',
}

export function TaskDetailActions({
  taskId,
  currentStatus,
  currentAssigneeEmail,
  currentRole,
  profiles,
  taskAssigneeId,
  taskDueDate,
  currentUserId,
  currentUserEmail,
  submissionCount,
  task,
}: TaskDetailActionsProps) {
  const router = useRouter()
  const [status, setStatus] = useState<TaskStatus>(currentStatus)
  const [assigneeEmail, setAssigneeEmail] = useState(currentAssigneeEmail)
  const [lateReason, setLateReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [reviewModalOpen, setReviewModalOpen] = useState(false)

  const isAdminOrManager = ['admin', 'manager'].includes(currentRole)
  const isVolunteer = currentRole === 'volunteer'

  const isAssignedToUser = Boolean(
    (currentUserId && taskAssigneeId && currentUserId === taskAssigneeId) ||
    (currentUserEmail && currentAssigneeEmail && currentUserEmail.toLowerCase() === currentAssigneeEmail.toLowerCase())
  )

  // Terminal state lock: if task is done, render read-only status banner for all roles
  if (currentStatus === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2Icon className="size-5" />
            </div>
            <div>
              <h3 className="font-heading text-base sm:text-lg font-semibold text-[#101828]">Task Completed & Locked</h3>
              <p className="text-xs text-[#64748B]">This task is in its final terminal state.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <CheckIcon className="size-3.5" /> Done
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              <LockIcon className="size-3" /> Read-Only
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed border-t border-emerald-200/60 pt-2.5">
          This task has been reviewed, approved, and marked complete. Status and volunteer assignments are permanently locked.
        </p>
      </div>
    )
  }

  // Volunteers should only see status management if the task is assigned to them.
  if (isVolunteer && !isAssignedToUser) {
    return null
  }

  // Strictly only volunteers are assignable to tasks
  const volunteerAssignees = profiles.filter((p) => p.role === 'volunteer')
  const selectedAssignee = profiles.find((p) => p.email === assigneeEmail || p.id === assigneeEmail)

  const isMovingToReviewLate = status === 'in_review' && isTaskPastDuePkt(taskDueDate)

  async function handleSave() {
    setLoading(true)
    setError('')
    setSuccess(false)

    if (status === 'in_review') {
      if (submissionCount !== undefined && submissionCount === 0) {
        setError('At least one submission attachment is required before submitting for review.')
        setLoading(false)
        return
      }

      if (isMovingToReviewLate && !lateReason.trim()) {
        setError('A reason is required for late submission.')
        setLoading(false)
        return
      }
    }

    const patch: Record<string, unknown> = {
      status,
    }

    if (isMovingToReviewLate) {
      patch.late_reason = lateReason.trim()
    }

    if (isAdminOrManager && selectedAssignee) {
      patch.assignee_id = selectedAssignee.id
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })

      setLoading(false)

      if (!res.ok) {
        const payload = await res.json()
        setError(payload.error || 'Failed to update task')
        return
      }

      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setLoading(false)
      setError('Network error')
    }
  }

  return (
    <div className="rounded-2xl border border-[#D8E0EA] bg-white p-4 shadow-sm sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-lg font-semibold text-[#101828]">Task Management & Status</h3>
          {isAdminOrManager && (
            <span className="rounded-full bg-[#EAF1FF] px-2.5 py-0.5 text-xs font-semibold text-[#0F3F7F]">
              {currentRole.toUpperCase()} CONTROL
            </span>
          )}
        </div>

        {isAdminOrManager && currentStatus === 'in_review' && task && (
          <Button
            type="button"
            onClick={() => setReviewModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#15803d]"
          >
            <ClipboardCheckIcon className="size-4" />
            Review Submission
          </Button>
        )}
      </div>

      <div className={isAdminOrManager ? "grid gap-4 grid-cols-1 sm:grid-cols-2" : "max-w-xs"}>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Status
          </label>
          <Select value={status} onValueChange={(val) => setStatus(val as TaskStatus)}>
            <SelectTrigger className="h-10 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA]">
              <SelectValue placeholder={statusLabels[status] || status}>
                {statusLabels[status] || status}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdminOrManager && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Reassign Volunteer
            </label>
            <Select value={assigneeEmail} onValueChange={(val) => setAssigneeEmail(val ?? '')}>
              <SelectTrigger className="h-10 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA]">
                <SelectValue placeholder="Select volunteer...">
                  {selectedAssignee ? selectedAssignee.full_name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {volunteerAssignees.map((p) => (
                  <SelectItem key={p.id} value={p.email}>
                    {p.full_name || p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {status === 'in_review' && submissionCount !== undefined && submissionCount === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Submission Attachment Required
          </p>
          <p className="text-[11px] text-amber-800">
            Please upload your deliverable (file or video link) under &quot;Submitted Work&quot; before moving this task to &quot;In review&quot;.
          </p>
        </div>
      )}

      {isMovingToReviewLate && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
            Reason for Late Submission (Required) *
          </label>
          <p className="text-[11px] text-amber-800">
            This task's due date ({taskDueDate}) has passed in Pakistan time (PKT). Explain the reason for late submission to the reviewing manager.
          </p>
          <textarea
            required
            rows={2}
            value={lateReason}
            onChange={(e) => setLateReason(e.target.value)}
            placeholder="Explain why this submission was delayed..."
            className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs text-[#101828] outline-none transition focus:border-[#0F3F7F] focus:ring-1 focus:ring-[#0F3F7F]"
          />
        </div>
      )}

      {error && <p className="text-xs font-semibold text-[#DC2626]">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        {success ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
            <CheckIcon className="size-4 text-[#166534]" /> Saved successfully
          </p>
        ) : (
          <span />
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="h-9 rounded-xl bg-[#0F3F7F] px-5 text-xs font-semibold text-white hover:bg-[#0b3164]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCwIcon className="size-3.5 animate-spin" /> Saving...
            </span>
          ) : isAdminOrManager ? (
            'Save status & assignment'
          ) : (
            'Save status'
          )}
        </Button>
      </div>

      {isAdminOrManager && task && (
        <TaskReviewModal
          task={task}
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          onSuccess={(_updated, _msg) => {
            setReviewModalOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
