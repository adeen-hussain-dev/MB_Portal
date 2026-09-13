'use client'

import React, { useState } from 'react'
import type { TaskRecord, TaskStatus } from '@/lib/task-store'
import {
  ClipboardCheckIcon,
  XIcon,
  PaperclipIcon,
  ExternalLinkIcon,
  FileIcon,
  DownloadIcon,
  StarIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
    case 'zip':
      return 'ZIP Archive'
    default:
      return 'File'
  }
}

export interface TaskReviewModalProps {
  task: TaskRecord | null
  open: boolean
  onClose: () => void
  onSuccess: (updatedTask: TaskRecord, message: string) => void
}

export function TaskReviewModal({
  task,
  open,
  onClose,
  onSuccess,
}: TaskReviewModalProps) {
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

  // Split attachments into Submitted Work and Reference Materials
  const allAttDetails = task.attachmentDetails || []
  const submittedWork = allAttDetails.filter((a) => a.purpose === 'submission')
  const referenceMaterials = allAttDetails.filter(
    (a) => a.purpose === 'reference' || !a.purpose
  )

  // Fallback for legacy string attachments if attachmentDetails is empty
  const hasDetails = allAttDetails.length > 0
  const legacyAttachments = !hasDetails ? task.attachments : []

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleReset()}>
      <DialogContent
        showCloseButton={false}
        className="w-full sm:max-w-2xl p-0 overflow-hidden rounded-2xl border border-[#D8E0EA] bg-white shadow-2xl"
      >
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
            className="rounded-lg p-1 text-[#64748B] hover:bg-slate-200/60 hover:text-[#101828] transition"
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
            <div className="rounded-xl border border-[#D8E0EA] bg-white p-3.5 text-xs sm:text-sm text-[#334155] leading-relaxed max-h-32 overflow-y-auto">
              {task.description || 'No description provided.'}
            </div>
          </div>

          {/* Attachments Section - Separated by Purpose */}
          <div className="space-y-4">
            {/* 1. Submitted Work */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] flex items-center gap-1.5">
                  <PaperclipIcon className="size-3.5 text-emerald-700" />
                  Submitted Work ({submittedWork.length})
                </h4>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Volunteer Deliverables
                </span>
              </div>

              {submittedWork.length === 0 ? (
                <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 text-center">
                  No submissions uploaded yet for this task.
                </p>
              ) : (
                <div className="space-y-2">
                  {submittedWork.map((att, index) => {
                    const isLink = att.attachmentType === 'link' || att.fileUrl.includes('drive.google.com') || att.fileUrl.includes('youtube.com') || att.fileUrl.includes('youtu.be')
                    const fileName = att.fileName || `Submission ${index + 1}`
                    const fileType = isLink ? 'Video / Cloud Link' : getFileType(fileName)

                    return (
                      <div
                        key={att.id || att.fileUrl || index}
                        className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-2.5 sm:p-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                            {isLink ? <ExternalLinkIcon className="size-4" /> : <FileIcon className="size-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-xs font-semibold text-[#101828]" title={fileName}>
                                {fileName}
                              </p>
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wider shrink-0">
                                Submission
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-700">{fileType}</p>
                          </div>
                        </div>

                        <a
                          href={att.fileUrl}
                          download={isLink ? undefined : fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-800 shrink-0"
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
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. Reference Materials */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <PaperclipIcon className="size-3.5 text-[#0F3F7F]" />
                  Reference Materials ({hasDetails ? referenceMaterials.length : legacyAttachments.length})
                </h4>
                <span className="text-[10px] font-semibold text-[#0F3F7F] bg-[#EAF1FF] px-2 py-0.5 rounded-full">
                  Task Briefs & Templates
                </span>
              </div>

              {(hasDetails ? referenceMaterials.length : legacyAttachments.length) === 0 ? (
                <p className="rounded-xl border border-dashed border-[#D8E0EA] bg-[#F8FAFC] p-3 text-xs text-[#94A3B8] text-center">
                  No reference materials attached.
                </p>
              ) : hasDetails ? (
                <div className="space-y-2">
                  {referenceMaterials.map((att, index) => {
                    const isLink = att.attachmentType === 'link' || att.fileUrl.includes('drive.google.com') || att.fileUrl.includes('youtube.com') || att.fileUrl.includes('youtu.be')
                    const fileName = att.fileName || `Reference ${index + 1}`
                    const fileType = isLink ? 'Video / Cloud Link' : getFileType(fileName)

                    return (
                      <div
                        key={att.id || att.fileUrl || index}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] p-2.5 sm:p-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF1FF] text-[#0F3F7F]">
                            {isLink ? <ExternalLinkIcon className="size-4" /> : <FileIcon className="size-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-xs font-semibold text-[#101828]" title={fileName}>
                                {fileName}
                              </p>
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 uppercase tracking-wider shrink-0">
                                Reference
                              </span>
                            </div>
                            <p className="text-[10px] text-[#64748B]">{fileType}</p>
                          </div>
                        </div>

                        <a
                          href={att.fileUrl}
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
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {legacyAttachments.map((att, index) => {
                    const isUrl = att.startsWith('http://') || att.startsWith('https://')
                    const isLink = att.includes('drive.google.com') || att.includes('youtube.com') || att.includes('youtu.be')
                    const fileName = att.split('/').pop()?.split('_').slice(1).join('_') || att.split('/').pop() || `Reference ${index + 1}`
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
                            <div className="flex items-center gap-2">
                              <p className="truncate text-xs font-semibold text-[#101828]" title={fileName}>
                                {fileName}
                              </p>
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 uppercase tracking-wider shrink-0">
                                Reference
                              </span>
                            </div>
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

              {/* Action Buttons: Responsive row on desktop (no overflow) and mobile */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode('request_changes')}
                  disabled={loading}
                  className="w-full sm:w-auto shrink-0 rounded-xl border-[#DC2626] px-4 text-xs font-semibold text-[#DC2626] hover:bg-rose-50 h-10"
                >
                  Request Changes
                </Button>

                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={loading || !satisfactionRating}
                  className="w-full sm:w-auto shrink-0 rounded-xl bg-[#16A34A] px-5 text-xs font-semibold text-white hover:bg-[#15803d] disabled:opacity-50 h-10 shadow-sm"
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

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('decision')}
                  disabled={loading}
                  className="rounded-xl text-xs font-semibold text-[#64748B] h-9"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={handleRequestChanges}
                  disabled={loading || !rejectionReason.trim()}
                  className="rounded-xl bg-[#DC2626] px-4 text-xs font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-50 h-9"
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
