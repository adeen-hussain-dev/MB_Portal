'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  ClipboardListIcon,
  ClockIcon,
  HelpCircleIcon,
  MessageSquareCheckIcon,
  SparklesIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface NotificationItem {
  id: string
  userId: string
  type: 'task_assigned' | 'task_status' | 'question_asked' | 'question_answered' | 'system'
  title: string
  body: string
  taskId?: string | null
  isRead: boolean
  createdAt: string
}

function formatRelativeTime(dateString: string): string {
  try {
    const diffSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diffSeconds < 60) return 'Just now'
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

function getNotificationIcon(type: NotificationItem['type'], title: string) {
  if (type === 'task_assigned') {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0F3F7F] border border-blue-100">
        <ClipboardListIcon className="size-4" />
      </div>
    )
  }
  if (type === 'question_asked') {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
        <HelpCircleIcon className="size-4" />
      </div>
    )
  }
  if (type === 'question_answered') {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
        <MessageSquareCheckIcon className="size-4" />
      </div>
    )
  }
  if (type === 'task_status') {
    if (title.toLowerCase().includes('approved') || title.toLowerCase().includes('done')) {
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2Icon className="size-4" />
        </div>
      )
    }
    if (title.toLowerCase().includes('changes')) {
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
          <AlertCircleIcon className="size-4" />
        </div>
      )
    }
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
        <ClockIcon className="size-4" />
      </div>
    )
  }

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
      <SparklesIcon className="size-4" />
    </div>
  )
}

interface NotificationBellProps {
  theme?: 'light' | 'dark'
}

export function NotificationBell({ theme = 'light' }: NotificationBellProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 1. Fetch initial notifications
  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  useEffect(() => {
    loadNotifications()

    // 2. Realtime listener on notifications table
    const supabase = createClient()
    let channel: any = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new as any
            if (!newRow) return
            const newItem: NotificationItem = {
              id: newRow.id,
              userId: newRow.user_id,
              type: newRow.type,
              title: newRow.title,
              body: newRow.body,
              taskId: newRow.task_id,
              isRead: Boolean(newRow.is_read),
              createdAt: newRow.created_at,
            }

            setNotifications((prev) => [newItem, ...prev.filter((n) => n.id !== newItem.id)])
            if (!newItem.isRead) {
              setUnreadCount((c) => c + 1)
            }
          }
        )
        .subscribe()
    })

    // Fallback periodic poll every 30s
    const interval = setInterval(loadNotifications, 30000)

    return () => {
      clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // 3. Click outside or escape to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // 4. Mark single notification as read
  async function markAsRead(id: string) {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  // 5. Mark all as read
  async function markAllAsRead() {
    if (unreadCount === 0 || isMarkingAll) return
    setIsMarkingAll(true)
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
    } catch (err) {
      console.error('Failed to mark all read:', err)
    } finally {
      setIsMarkingAll(false)
    }
  }

  // 6. Handle notification click (navigate to task if present)
  function handleNotificationClick(item: NotificationItem) {
    if (!item.isRead) {
      markAsRead(item.id)
    }
    setIsOpen(false)
    if (item.taskId) {
      router.push(`/tasks/${item.taskId}`)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className="relative inline-block">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev)
          if (!isOpen) loadNotifications()
        }}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className={`relative flex size-9 items-center justify-center rounded-xl transition duration-150 ${
          isDark
            ? 'border border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'border border-[#D8E0EA] bg-white text-[#475467] shadow-xs hover:border-[#0F3F7F] hover:text-[#0F3F7F]'
        }`}
      >
        <BellIcon className="size-4.5" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFC107] px-1 text-[10px] font-extrabold text-[#0F3F7F] shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-[#D8E0EA] bg-white text-[#101828] shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#F1F5F9] bg-[#F8FAFC] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold text-[#101828]">Notifications</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[#0F3F7F] px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount} new
                </span>
              ) : (
                <span className="rounded-full bg-[#E2E8F0] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
                  All read
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={isMarkingAll}
                className="flex items-center gap-1 text-xs font-semibold text-[#0F3F7F] hover:text-[#0b3164] transition-colors disabled:opacity-50"
              >
                <CheckCheckIcon className="size-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] divide-y divide-[#F1F5F9] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-[#64748B]">
                <div className="flex size-12 items-center justify-center rounded-full bg-[#F1F5F9] text-[#94A3B8] mb-3">
                  <BellIcon className="size-6" />
                </div>
                <p className="text-xs font-semibold text-[#101828]">No notifications yet</p>
                <p className="text-[11px] text-[#94A3B8] max-w-xs mt-1">
                  You will be notified when tasks are assigned, reviewed, or questions are answered.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative flex items-start gap-3 p-3.5 cursor-pointer transition-colors ${
                    item.isRead ? 'bg-white hover:bg-[#F8FAFC]' : 'bg-[#F0F7FF] hover:bg-[#E5F0FF]'
                  }`}
                >
                  {/* Type Icon */}
                  {getNotificationIcon(item.type, item.title)}

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p
                        className={`truncate text-xs font-semibold ${
                          item.isRead ? 'text-[#334155]' : 'text-[#0F3F7F] font-bold'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-[#94A3B8]">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>

                    {item.taskId && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#0F3F7F]">
                        View task <ExternalLinkIcon className="size-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Unread Indicator & Individual Mark Read Button */}
                  <div className="shrink-0 flex items-center gap-1 pt-1">
                    {!item.isRead && (
                      <>
                        <span className="size-2 rounded-full bg-[#0F3F7F] group-hover:hidden" />
                        <button
                          type="button"
                          title="Mark as read"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(item.id)
                          }}
                          className="hidden group-hover:flex size-5 items-center justify-center rounded-full bg-white text-[#0F3F7F] shadow-xs border border-[#D8E0EA] hover:bg-[#0F3F7F] hover:text-white transition"
                        >
                          <CheckIcon className="size-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-[#F1F5F9] bg-[#F8FAFC] px-4 py-2 text-center">
              <p className="text-[10px] text-[#94A3B8]">
                Mustaqbil Bridge Notification Center
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
