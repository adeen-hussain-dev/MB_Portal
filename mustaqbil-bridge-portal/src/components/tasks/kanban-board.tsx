'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TaskPriority, TaskRecord, TaskStatus } from '@/lib/task-store'
import {
  CalendarIcon,
  PaperclipIcon,
  AlertCircleIcon,
  GripVerticalIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileIcon,
  DownloadIcon,
  LockIcon,
  XIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  StarIcon,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { isTaskPastDuePkt } from '@/lib/date-utils'

type ColumnConfig = {
  key: TaskStatus
  title: string
  accentColor: string
  badgeBg: string
  badgeText: string
  dotColor: string
  isDropAllowed: boolean
  helperText?: string
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    key: 'todo',
    title: 'To do',
    accentColor: '#64748B',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    dotColor: 'bg-slate-400',
    isDropAllowed: true,
  },
  {
    key: 'in_progress',
    title: 'In progress',
    accentColor: '#0F3F7F',
    badgeBg: 'bg-[#EAF1FF]',
    badgeText: 'text-[#0F3F7F]',
    dotColor: 'bg-[#0F3F7F]',
    isDropAllowed: true,
  },
  {
    key: 'in_review',
    title: 'In review',
    accentColor: '#D97706', // Approved amber badge variant token
    badgeBg: 'bg-amber-50',
    badgeText: 'text-[#D97706]',
    dotColor: 'bg-[#D97706]',
    isDropAllowed: true,
  },
  {
    key: 'changes_requested',
    title: 'Changes requested',
    accentColor: '#DC2626',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    dotColor: 'bg-rose-500',
    isDropAllowed: false,
    helperText: 'Set via Review',
  },
  {
    key: 'done',
    title: 'Done',
    accentColor: '#16A34A',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    isDropAllowed: false,
    helperText: 'Set via Review',
  },
]

const priorityBadges: Record<TaskPriority, { label: string; bg: string; text: string; dot: string }> = {
  high: { label: 'High', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  medium: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { label: 'Low', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

function getInitials(name: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getFileType(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) return 'Image'
  if (['pdf'].includes(ext || '')) return 'PDF'
  if (['doc', 'docx'].includes(ext || '')) return 'Word'
  if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) return 'Archive'
  return 'Document'
}

// -------------------------------------------------------------------
// Sortable Task Card Component
// -------------------------------------------------------------------
function KanbanCard({
  task,
  isOverlay = false,
  canReview = false,
  onOpenReview,
}: {
  task: TaskRecord
  isOverlay?: boolean
  canReview?: boolean
  onOpenReview?: (task: TaskRecord) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const priorityInfo = priorityBadges[task.priority] || priorityBadges.medium

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 ${
        isDragging ? 'opacity-30 border-dashed border-[#0F3F7F]' : 'border-[#D8E0EA] hover:border-[#0F3F7F]/40 hover:shadow-md'
      } ${isOverlay ? 'shadow-2xl ring-2 ring-[#0F3F7F]/50 rotate-1 cursor-grabbing bg-white' : ''}`}
    >
      {/* Drag handle & top tags */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {task.domain && (
            <span className="rounded-md bg-[#F5F7FA] px-2 py-0.5 text-[11px] font-medium text-[#64748B]">
              {task.domain}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${priorityInfo.bg} ${priorityInfo.text}`}
          >
            <span className={`size-1.5 rounded-full ${priorityInfo.dot}`} />
            {priorityInfo.label}
          </span>
        </div>

        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Drag task"
          className="cursor-grab text-slate-300 transition-colors hover:text-[#0F3F7F] active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </div>

      {/* Title */}
      <h3 className="mt-2.5 font-heading text-sm font-semibold text-[#101828] line-clamp-2">
        <Link
          href={`/tasks/${task.id}`}
          className="transition-colors hover:text-[#0F3F7F] hover:underline"
          onClick={(e) => {
            if (isDragging) e.preventDefault()
          }}
        >
          {task.title}
        </Link>
      </h3>

      {/* Description Preview */}
      {task.description && (
        <p className="mt-1 text-xs text-[#64748B] line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* In-Review action button for Admin/Manager */}
      {canReview && task.status === 'in_review' && onOpenReview && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onOpenReview(task)
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F3F7F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0b3164] active:scale-[0.99]"
        >
          <ClipboardCheckIcon className="size-3.5" />
          Review Task
        </button>
      )}

      {/* Footer Info */}
      <div className="mt-3.5 flex items-center justify-between border-t border-[#F1F5F9] pt-2.5 text-xs text-[#64748B]">
        {/* Assignee */}
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0F3F7F] text-[10px] font-bold text-white">
            {getInitials(task.assigneeName || task.assigneeEmail)}
          </span>
          <span className="max-w-[90px] truncate font-medium text-[#334155]">
            {task.assigneeName || 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Due date */}
          {task.dueDate && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#64748B]">
              <CalendarIcon className="size-3 text-[#94A3B8]" />
              {task.dueDate}
            </span>
          )}

          {/* Attachments */}
          {task.attachments.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#64748B]">
              <PaperclipIcon className="size-3 text-[#94A3B8]" />
              {task.attachments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Droppable Kanban Column Component
// -------------------------------------------------------------------
function KanbanColumn({
  column,
  tasks,
  canReview,
  onOpenReview,
}: {
  column: ColumnConfig
  tasks: TaskRecord[]
  canReview: boolean
  onOpenReview: (task: TaskRecord) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    data: {
      type: 'Column',
      column,
    },
    disabled: !column.isDropAllowed,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[280px] max-w-[320px] flex-1 flex-col rounded-2xl border bg-[#F8FAFC] p-3.5 transition-colors ${
        isOver && column.isDropAllowed
          ? 'border-[#0F3F7F] bg-[#EAF1FF]/40 ring-2 ring-[#0F3F7F]/20'
          : 'border-[#D8E0EA]'
      }`}
    >
      {/* Column Header */}
      <div className="mb-3.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${column.dotColor}`} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F3F7F]">
            {column.title}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {column.helperText && (
            <span className="inline-flex items-center gap-0.5 rounded bg-slate-200/70 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
              <LockIcon className="size-2.5" />
              {column.helperText}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${column.badgeBg} ${column.badgeText}`}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task List container */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-3 min-h-[140px]">
          {tasks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-white/50 p-6 text-center text-xs text-[#94A3B8]">
              No tasks in {column.title}
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                canReview={canReview}
                onOpenReview={onOpenReview}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// -------------------------------------------------------------------
// Review Dialog Component for Admin / Manager
// -------------------------------------------------------------------
function TaskReviewModal({
  task,
  open,
  onClose,
  onSuccess,
}: {
  task: TaskRecord | null
  open: boolean
  onClose: () => void
  onSuccess: (updatedTask: TaskRecord, message: string) => void
}) {
  const [mode, setMode] = useState<'decision' | 'request_changes'>('decision')
  const [rejectionReason, setRejectionReason] = useState('')
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!task) return null

  function handleReset() {
    setMode('decision')
    setRejectionReason('')
    setSatisfactionRating(null)
    setError(null)
    onClose()
  }

  async function handleApprove() {
    if (!satisfactionRating || satisfactionRating < 1 || satisfactionRating > 10) {
      setError('Please select a satisfaction rating (1 to 10) before approving.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${task!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'done',
          satisfaction_rating: satisfactionRating,
        }),
      })

      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve task')
      }

      const updated = { ...task!, status: 'done' as TaskStatus, satisfactionRating }
      onSuccess(updated, `Approved "${task!.title}" with rating ${satisfactionRating}/10 — marked as Done.`)
      handleReset()
    } catch (err: unknown) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Failed to approve task')
    }
  }

  async function handleRequestChanges() {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason describing the required changes before submitting.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${task!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'changes_requested',
          reason: rejectionReason.trim(),
        }),
      })

      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request changes')
      }

      const updated = { ...task!, status: 'changes_requested' as TaskStatus }
      onSuccess(updated, `Changes requested on "${task!.title}". Reason added to task comments.`)
      handleReset()
    } catch (err: unknown) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Failed to request changes')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleReset()}>
      <DialogContent showCloseButton={false} className="max-w-xl p-0 overflow-hidden rounded-2xl border border-[#D8E0EA] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D8E0EA] bg-[#F5F7FA] px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardCheckIcon className="size-5 text-[#0F3F7F]" />
            <DialogTitle className="font-heading text-lg font-semibold text-[#101828]">
              Review Task Submission
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg p-1 text-[#64748B] hover:bg-slate-200/60 hover:text-[#101828]"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Metadata Row */}
          <div className="rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-heading text-base font-bold text-[#101828]">
                {task.title}
              </span>
              <span className="rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-[#D97706] border border-amber-200">
                In Review
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <span className="block text-[10px] uppercase font-bold text-[#64748B]">Assignee</span>
                <span className="font-medium text-[#101828]">{task.assigneeName || 'Unassigned'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-[#64748B]">Priority</span>
                <span className="capitalize font-medium text-[#101828]">{task.priority}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-[#64748B]">Domain</span>
                <span className="font-medium text-[#101828]">{task.domain || '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-[#64748B]">Due Date</span>
                <span className="font-mono text-[#101828]">{task.dueDate || '—'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              Task Description
            </h4>
            <div className="rounded-xl border border-[#D8E0EA] bg-white p-3.5 text-xs sm:text-sm text-[#334155] leading-relaxed max-h-40 overflow-y-auto">
              {task.description || 'No description provided.'}
            </div>
          </div>

          {/* Attachments Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1.5">
              <PaperclipIcon className="size-3.5" />
              Attachments ({task.attachments.length})
            </h4>

            {task.attachments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#D8E0EA] p-3 text-xs text-[#94A3B8] text-center">
                No attachments uploaded for this task.
              </p>
            ) : (
              <div className="space-y-2">
                {task.attachments.map((att, index) => {
                  const isUrl = att.startsWith('http://') || att.startsWith('https://')
                  const isLink = att.includes('drive.google.com') || att.includes('youtube.com') || att.includes('youtu.be')
                  const fileName = att.split('/').pop()?.split('_').slice(1).join('_') || att.split('/').pop() || `Attachment ${index + 1}`
                  const fileType = isLink ? 'Video / Cloud Link' : getFileType(fileName)

                  return (
                    <div
                      key={att}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] p-2.5 sm:p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF1FF] text-[#0F3F7F]">
                          {isLink ? <ExternalLinkIcon className="size-4" /> : <FileIcon className="size-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#101828]" title={fileName}>
                            {fileName}
                          </p>
                          <p className="text-[10px] text-[#64748B]">{fileType}</p>
                        </div>
                      </div>

                      {isUrl && (
                        <a
                          href={att}
                          download={isLink ? undefined : fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0F3F7F] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#0b3164] shrink-0"
                        >
                          {isLink ? (
                            <>
                              <ExternalLinkIcon className="size-3" /> Open Link
                            </>
                          ) : (
                            <>
                              <DownloadIcon className="size-3" /> Download
                            </>
                          )}
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Area */}
          {mode === 'decision' ? (
            <div className="pt-3 border-t border-[#F1F5F9] space-y-4">
              <div className="rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#101828] uppercase tracking-wider flex items-center gap-1.5">
                    <StarIcon className="size-3.5 text-amber-500 fill-amber-500" />
                    Satisfaction Rating (Mandatory, 1–10)
                  </label>
                  {satisfactionRating && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Score: {satisfactionRating}/10
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Rate the quality of the submitted work to reward the volunteer on the leaderboard.
                </p>
                <div className="grid grid-cols-10 gap-1 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setSatisfactionRating(score)}
                      className={`h-9 rounded-lg text-xs font-bold transition-all ${
                        satisfactionRating === score
                          ? 'bg-[#16A34A] text-white shadow-sm ring-2 ring-[#16A34A]/30 scale-105'
                          : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-slate-100 hover:border-[#94A3B8]'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode('request_changes')}
                  disabled={loading}
                  className="w-full sm:w-auto rounded-xl border-[#DC2626] text-[#DC2626] hover:bg-rose-50"
                >
                  Request Changes
                </Button>

                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={loading || !satisfactionRating}
                  className="w-full sm:w-auto rounded-xl bg-[#16A34A] px-5 text-white hover:bg-[#15803d] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCwIcon className="size-4 animate-spin" /> Approving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2Icon className="size-4" /> Approve (Mark as Done)
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#F1F5F9] space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#DC2626] uppercase tracking-wider mb-1">
                  Reason for Requesting Changes (Required)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain what needs to be changed before this task can be approved..."
                  rows={3}
                  className="w-full rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] p-3 text-xs sm:text-sm text-[#101828] outline-none transition focus:border-[#DC2626] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('decision')}
                  disabled={loading}
                  className="rounded-xl text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={handleRequestChanges}
                  disabled={loading || !rejectionReason.trim()}
                  className="rounded-xl bg-[#DC2626] px-4 text-xs font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCwIcon className="size-3.5 animate-spin" /> Submitting...
                    </span>
                  ) : (
                    'Submit Changes Request'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------------
// Late Submission Dialog Component
// -------------------------------------------------------------------
function LateSubmissionModal({
  task,
  open,
  onClose,
  onSubmit,
}: {
  task: TaskRecord | null
  open: boolean
  onClose: () => void
  onSubmit: (task: TaskRecord, reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!task) return null

  function handleCancel() {
    setReason('')
    setError(null)
    onClose()
  }

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('A reason is required for late submission.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSubmit(task!, reason.trim())
      setReason('')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit late task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent showCloseButton={false} className="max-w-lg p-0 overflow-hidden rounded-2xl border border-[#D8E0EA] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D8E0EA] bg-[#FFFBEB] px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="size-5 text-[#D97706]" />
            <DialogTitle className="font-heading text-lg font-semibold text-[#101828]">
              Late Submission Reason
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg p-1 text-[#64748B] hover:bg-slate-200/60 hover:text-[#101828]"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs text-amber-900 leading-relaxed">
            This task was due on <span className="font-mono font-bold">{task.dueDate}</span> (PKT). A brief explanation is required before moving to <strong>In Review</strong>. This explanation will be posted as a comment on the task.
          </div>

          <div>
            <label className="block text-xs font-bold text-[#101828] uppercase tracking-wider mb-1.5">
              Reason for Late Submission (Required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Blocked on asset export / personal emergency..."
              rows={3}
              className="w-full rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] p-3 text-xs sm:text-sm text-[#101828] outline-none transition focus:border-[#0F3F7F] focus:bg-white"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={loading}
              className="rounded-xl text-xs font-semibold text-[#64748B]"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !reason.trim()}
              className="rounded-xl bg-[#0F3F7F] px-4 text-xs font-semibold text-white hover:bg-[#0b3164] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCwIcon className="size-3.5 animate-spin" /> Submitting...
                </span>
              ) : (
                'Submit for Review'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------------
// Main KanbanBoard Component
// -------------------------------------------------------------------
type KanbanBoardProps = {
  tasks: TaskRecord[]
  currentUser?: {
    id: string
    role: string
    full_name?: string | null
    email?: string | null
  } | null
  onTaskUpdated?: (updatedTask: TaskRecord) => void
}

export function KanbanBoard({ tasks: initialTasks, currentUser, onTaskUpdated }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null)
  const [reviewModalTask, setReviewModalTask] = useState<TaskRecord | null>(null)
  const [lateSubmissionModalTask, setLateSubmissionModalTask] = useState<TaskRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Keep local tasks synchronized when parent filters change
  if (initialTasks !== tasks && initialTasks.length !== tasks.length) {
    setTasks(initialTasks)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // Prevents triggering drag on standard clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const userRole = currentUser?.role || 'volunteer'
  const isVolunteer = userRole === 'volunteer'
  const canReview = userRole === 'admin' || userRole === 'manager'

  function handleDragStart(event: DragStartEvent) {
    setErrorMessage(null)
    setSuccessMessage(null)
    const { active } = event
    const foundTask = tasks.find((t) => t.id === active.id)
    if (foundTask) {
      setActiveTask(foundTask)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const currentTask = tasks.find((t) => t.id === taskId)
    if (!currentTask) return

    // Destination could be a column key directly, or another task inside that column
    let destinationStatus: TaskStatus | null = null

    if (KANBAN_COLUMNS.some((col) => col.key === over.id)) {
      destinationStatus = over.id as TaskStatus
    } else {
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask) {
        destinationStatus = overTask.status
      }
    }

    if (!destinationStatus || destinationStatus === currentTask.status) {
      return
    }

    // RULE 1: Done and Changes Requested are NOT valid drop targets for ANY role!
    if (destinationStatus === 'done' || destinationStatus === 'changes_requested') {
      setErrorMessage("Done and Changes Requested columns are set through the Review action, not drag-and-drop.")
      setTimeout(() => setErrorMessage(null), 4000)
      return
    }

    // RULE 2: Volunteers can only move their own assigned tasks
    if (isVolunteer) {
      if (
        currentUser?.email &&
        currentTask.assigneeEmail !== currentUser.email &&
        currentTask.assigneeName !== currentUser.full_name
      ) {
        setErrorMessage('You can only move tasks assigned to you.')
        setTimeout(() => setErrorMessage(null), 4000)
        return
      }
    }

    // RULE 3: Late-submission check (PKT)
    if (destinationStatus === 'in_review' && isTaskPastDuePkt(currentTask.dueDate)) {
      setLateSubmissionModalTask(currentTask)
      return
    }

    const previousStatus = currentTask.status

    // Optimistically update local state
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: destinationStatus as TaskStatus } : t
    )
    setTasks(updatedTasks)

    const updatedTask = { ...currentTask, status: destinationStatus }
    onTaskUpdated?.(updatedTask)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: destinationStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update task status')
      }

      setSuccessMessage(`Moved "${currentTask.title}" to ${destinationStatus.replace('_', ' ')}`)
      setTimeout(() => setSuccessMessage(null), 3500)
    } catch (err: unknown) {
      // Revert optimistic update on failure
      const reverted = tasks.map((t) =>
        t.id === taskId ? { ...t, status: previousStatus } : t
      )
      setTasks(reverted)
      onTaskUpdated?.(currentTask)

      const msg = err instanceof Error ? err.message : 'Could not save task status'
      setErrorMessage(msg)
      setTimeout(() => setErrorMessage(null), 4500)
    }
  }

  async function handleLateSubmit(task: TaskRecord, reason: string) {
    const previousStatus = task.status
    const updatedTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, status: 'in_review' as TaskStatus } : t
    )
    setTasks(updatedTasks)

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'in_review',
        late_reason: reason,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const reverted = tasks.map((t) =>
        t.id === task.id ? { ...t, status: previousStatus } : t
      )
      setTasks(reverted)
      throw new Error(errorData.error || 'Failed to submit late task')
    }

    const updatedTask = { ...task, status: 'in_review' as TaskStatus }
    onTaskUpdated?.(updatedTask)
    setSuccessMessage(`Moved "${task.title}" to In review (late reason noted).`)
    setTimeout(() => setSuccessMessage(null), 3500)
  }

  function handleReviewSuccess(updated: TaskRecord, message: string) {
    setTasks((cur) => cur.map((t) => (t.id === updated.id ? updated : t)))
    onTaskUpdated?.(updated)
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 4500)
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* Alert Banners for status transitions */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Scoped Horizontal Scroll for Kanban 5-Column Board */}
      <div className="w-full min-w-0 max-w-full overflow-x-auto pb-4 pt-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {KANBAN_COLUMNS.map((column) => {
              const columnTasks = tasks.filter((t) => t.status === column.key)
              return (
                <KanbanColumn
                  key={column.key}
                  column={column}
                  tasks={columnTasks}
                  canReview={canReview}
                  onOpenReview={(task) => setReviewModalTask(task)}
                />
              )
            })}
          </div>

          {/* Drag Overlay for smooth preview */}
          <DragOverlay>
            {activeTask ? (
              <KanbanCard task={activeTask} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Review Modal for Admin / Manager */}
      <TaskReviewModal
        task={reviewModalTask}
        open={Boolean(reviewModalTask)}
        onClose={() => setReviewModalTask(null)}
        onSuccess={handleReviewSuccess}
      />

      {/* Late Submission Modal for Tasks Moved to In Review past Due Date */}
      <LateSubmissionModal
        task={lateSubmissionModalTask}
        open={Boolean(lateSubmissionModalTask)}
        onClose={() => setLateSubmissionModalTask(null)}
        onSubmit={handleLateSubmit}
      />
    </div>
  )
}
