'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskQuestion } from '@/lib/task-store'
import { Button } from '@/components/ui/button'
import {
  HelpCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  MessageSquareIcon,
  SendIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  SparklesIcon,
} from 'lucide-react'

type TaskQuestionsProps = {
  taskId: string
  initialQuestions: TaskQuestion[]
  userRole: string
  currentUserId?: string | null
  isAssignee: boolean
  taskStatus?: string
}

export function TaskQuestions({
  taskId,
  initialQuestions,
  userRole,
  isAssignee,
  taskStatus,
}: TaskQuestionsProps) {
  const router = useRouter()
  const [questions, setQuestions] = useState<TaskQuestion[]>(initialQuestions)
  const [questionText, setQuestionText] = useState('')
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)
  const [questionSuccess, setQuestionSuccess] = useState<string | null>(null)

  // Managing inline answer forms for admin/manager
  const [activeAnswerId, setActiveAnswerId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)

  const isAdminOrManager = ['admin', 'manager'].includes(userRole)
  const canAskQuestion = taskStatus !== 'done' && (isAssignee || (userRole === 'volunteer' && isAssignee))

  async function handlePostQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!questionText.trim()) return

    setIsSubmittingQuestion(true)
    setQuestionError(null)
    setQuestionSuccess(null)

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          question: questionText.trim(),
        }),
      })

      const data = await res.json()
      setIsSubmittingQuestion(false)

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit question')
      }

      setQuestionText('')
      setQuestionSuccess('Question submitted! Admins and managers have been notified.')
      setQuestions((prev) => [...prev, data.question])
      router.refresh()

      setTimeout(() => setQuestionSuccess(null), 4000)
    } catch (err) {
      setIsSubmittingQuestion(false)
      setQuestionError(err instanceof Error ? err.message : 'Network error')
    }
  }

  async function handlePostAnswer(questionId: string) {
    if (!answerText.trim()) return

    setIsSubmittingAnswer(true)
    setAnswerError(null)

    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answerText.trim(),
        }),
      })

      const data = await res.json()
      setIsSubmittingAnswer(false)

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit answer')
      }

      setAnswerText('')
      setActiveAnswerId(null)
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, ...data.question, status: 'answered' } : q))
      )
      router.refresh()
    } catch (err) {
      setIsSubmittingAnswer(false)
      setAnswerError(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="rounded-2xl sm:rounded-[2rem] border border-[#D8E0EA] bg-white p-4 sm:p-6 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#0F3F7F]">
            <HelpCircleIcon className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg sm:text-xl font-semibold text-[#101828]">
                Volunteer Q&A
              </h2>
              <span className="rounded-full bg-[#F5F7FA] px-2.5 py-0.5 text-xs font-bold text-[#64748B] border border-[#E2E8F0]">
                {questions.length}
              </span>
            </div>
            <p className="text-xs text-[#64748B]">Clarifications and guidance from leadership</p>
          </div>
        </div>

        {questions.some((q) => q.status === 'open') && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-[#D97706] border border-amber-200">
            <ClockIcon className="size-3.5" /> Open Questions
          </span>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8E0EA] bg-[#F8FAFC] p-6 text-center space-y-2">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-white text-[#94A3B8] shadow-sm">
              <MessageSquareIcon className="size-5" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[#475467]">No questions asked yet</p>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
              {canAskQuestion
                ? 'Need clarification on requirements, deliverables, or deadlines? Ask below.'
                : 'When the assigned volunteer asks a question regarding this task, it will appear here.'}
            </p>
          </div>
        ) : (
          questions.map((q) => {
            const isAnswered = q.status === 'answered' || Boolean(q.answer)
            const isAnsweringThis = activeAnswerId === q.id

            return (
              <article
                key={q.id}
                className="rounded-2xl border border-[#D8E0EA] bg-[#FAFBFD] p-4 sm:p-5 space-y-3 transition hover:border-[#0F3F7F]/30"
              >
                {/* Question Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-[#101828]">
                      {q.askedByName || 'Volunteer'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      Volunteer
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">
                      {new Date(q.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      isAnswered
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isAnswered ? 'Answered' : 'Awaiting Answer'}
                  </span>
                </div>

                {/* Question Content */}
                <p className="text-xs sm:text-sm leading-6 text-[#334155] font-medium bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
                  {q.question}
                </p>

                {/* Answer Display (if already answered) */}
                {isAnswered && (
                  <div className="rounded-xl border border-emerald-200 bg-[#F0FDF4] p-3.5 sm:p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <CheckCircle2Icon className="size-4 text-emerald-600" />
                        <span>{q.answeredByName || 'Leadership Team'}</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">
                          Answer
                        </span>
                      </div>
                      {q.answeredAt && (
                        <span className="text-[10px] text-emerald-700">
                          {new Date(q.answeredAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm leading-6 text-emerald-950 font-medium whitespace-pre-wrap">
                      {q.answer}
                    </p>
                  </div>
                )}

                {/* Admin / Manager Answer Action for Open Questions */}
                {!isAnswered && isAdminOrManager && (
                  <div className="pt-1">
                    {!isAnsweringThis ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveAnswerId(q.id)
                          setAnswerText('')
                          setAnswerError(null)
                        }}
                        className="rounded-xl border-[#0F3F7F] text-xs font-semibold text-[#0F3F7F] hover:bg-[#EAF1FF]"
                      >
                        <SparklesIcon className="size-3.5 mr-1 text-[#FFC107]" /> Answer this Question
                      </Button>
                    ) : (
                      <div className="rounded-xl border border-[#0F3F7F]/30 bg-white p-3.5 space-y-3 shadow-sm">
                        <label className="block text-xs font-bold text-[#0F3F7F] uppercase tracking-wider">
                          Your Answer (Volunteer will be notified via email)
                        </label>
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Provide clear guidance, links, or instructions..."
                          rows={3}
                          className="w-full rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] p-3 text-xs sm:text-sm text-[#101828] outline-none transition focus:border-[#0F3F7F] focus:bg-white"
                        />

                        {answerError && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                            <AlertCircleIcon className="size-3.5 shrink-0" />
                            <span>{answerError}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSubmittingAnswer}
                            onClick={() => {
                              setActiveAnswerId(null)
                              setAnswerText('')
                              setAnswerError(null)
                            }}
                            className="rounded-lg text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isSubmittingAnswer || !answerText.trim()}
                            onClick={() => handlePostAnswer(q.id)}
                            className="rounded-lg bg-[#0F3F7F] px-4 text-xs font-bold text-white hover:bg-[#0b3164]"
                          >
                            {isSubmittingAnswer ? (
                              <span className="flex items-center gap-1.5">
                                <RefreshCwIcon className="size-3.5 animate-spin" /> Sending...
                              </span>
                            ) : (
                              'Submit Answer'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>

      {/* Volunteer "Ask a Question" Form */}
      {canAskQuestion && (
        <form onSubmit={handlePostQuestion} className="pt-2 border-t border-[#F1F5F9] space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0F3F7F]">
            Ask a Question
          </label>
          <div className="space-y-2">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask a question about deliverables, requirements, or assets..."
              rows={3}
              className="w-full rounded-2xl border border-[#D8E0EA] bg-[#F8FAFC] p-3.5 text-xs sm:text-sm text-[#101828] outline-none transition focus:border-[#0F3F7F] focus:bg-white"
            />

            {questionError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
                <span>{questionError}</span>
              </div>
            )}

            {questionSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
                <span>{questionSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#94A3B8]">
                Admins and managers will be notified immediately.
              </p>
              <Button
                type="submit"
                disabled={isSubmittingQuestion || !questionText.trim()}
                className="rounded-xl bg-[#0F3F7F] px-4 py-2 text-xs font-bold text-white hover:bg-[#0b3164] disabled:opacity-50"
              >
                {isSubmittingQuestion ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCwIcon className="size-3.5 animate-spin" /> Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <SendIcon className="size-3.5" /> Send Question
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
