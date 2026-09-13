'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BanIcon,
  CheckCircle2Icon,
  Loader2Icon,
  ArrowUpRightIcon,
  ShieldAlertIcon,
} from 'lucide-react'

export interface ProfileRecord {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  domain: string | null
  status: string | null
}

export interface TeamMemberCardProps {
  profile: ProfileRecord
  openTasks: number
  isAdmin: boolean
  isManager: boolean
  currentUserId: string
}

export function TeamMemberCard({
  profile,
  openTasks,
  isAdmin,
  isManager,
  currentUserId,
}: TeamMemberCardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<string>(profile.status || 'active')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isSelf = profile.id === currentUserId
  const isInactive = status.toLowerCase() === 'inactive'
  const isVolunteer = (profile.role || 'volunteer').toLowerCase() === 'volunteer'
  const canViewAnalytics = (isAdmin || isManager) && isVolunteer

  async function handleToggleStatus(e: React.MouseEvent) {
    e.stopPropagation() // Prevent card navigation
    if (loading || isSelf) return

    const newStatus = isInactive ? 'active' : 'inactive'
    const previousStatus = status
    setStatus(newStatus)
    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/users/${profile.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update member status')
      }

      router.refresh()
    } catch (err: unknown) {
      setStatus(previousStatus) // Revert
      setErrorMessage(err instanceof Error ? err.message : 'Status update failed')
    } finally {
      setLoading(false)
    }
  }

  function handleCardClick() {
    if (canViewAnalytics) {
      router.push(`/analytics/${profile.id}`)
    }
  }

  return (
    <article
      onClick={handleCardClick}
      className={`relative rounded-[2rem] border border-[#D8E0EA] bg-white p-5 shadow-sm transition ${
        canViewAnalytics
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[#0F3F7F]/30 hover:shadow-md'
          : ''
      }`}
    >
      {/* Top Header: Name, Email, Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-heading text-xl font-semibold text-[#101828]">
              {profile.full_name ?? 'Unnamed volunteer'}
            </h2>
            {canViewAnalytics && (
              <span className="shrink-0 text-[#64748B] hover:text-[#0F3F7F]" title="View volunteer analytics">
                <ArrowUpRightIcon className="size-4" />
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-[#64748B]">{profile.email ?? 'No email on file'}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            isInactive ? 'bg-[#FEE4E2] text-[#B42318]' : 'bg-[#EAF7EE] text-[#166534]'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Role & Domain */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#F5F7FA] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Role</p>
          <p className="mt-1 text-sm font-medium text-[#101828] capitalize">{profile.role ?? 'volunteer'}</p>
        </div>
        <div className="rounded-2xl bg-[#F5F7FA] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Domain</p>
          <p className="mt-1 text-sm font-medium text-[#101828]">{profile.domain ?? '—'}</p>
        </div>
      </div>

      {/* Open Tasks Info */}
      <div className="mt-4 rounded-2xl bg-[#F5F7FA] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#64748B]">Open tasks</p>
        <p className="mt-1 text-sm font-medium text-[#101828]">{openTasks}</p>
        {isInactive && openTasks > 0 && (
          <p className="mt-2 text-sm text-[#B42318]">
            Warning: this inactive member still has {openTasks} open task{openTasks === 1 ? '' : 's'}.
          </p>
        )}
      </div>

      {errorMessage && (
        <p className="mt-2 rounded-xl bg-rose-50 p-2 text-xs font-medium text-rose-700">
          {errorMessage}
        </p>
      )}

      {/* Footer: Admin Block/Unblock Switch & Analytics Hint */}
      <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-3.5">
        {isAdmin && !isSelf ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-xs"
          >
            <button
              type="button"
              disabled={loading}
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold text-xs transition disabled:opacity-60 ${
                isInactive
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Updating...
                </>
              ) : isInactive ? (
                <>
                  <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                  Unblock member
                </>
              ) : (
                <>
                  <BanIcon className="size-3.5 text-rose-600" />
                  Block member
                </>
              )}
            </button>
            <span className="text-[11px] text-[#64748B]">
              {isInactive ? 'Access suspended' : 'Active account'}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[#94A3B8]">
            {isSelf ? 'Your profile' : 'Team member'}
          </span>
        )}

        {canViewAnalytics && (
          <span className="text-[11px] font-semibold text-[#0F3F7F] hover:underline">
            View analytics →
          </span>
        )}
      </div>
    </article>
  )
}
