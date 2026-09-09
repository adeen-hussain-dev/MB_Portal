'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/notifications/notification-bell'

export function TopHeader() {
  const [profile, setProfile] = useState<{
    full_name?: string | null
    role?: string | null
    avatar_url?: string | null
    email?: string | null
  } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('full_name, role, avatar_url, email')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data)
            else setProfile({ email: user.email })
          })
      }
    })
  }, [])

  const displayName = profile?.full_name || profile?.email || 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const roleText = profile?.role || 'Volunteer'

  return (
    <header className="sticky top-0 z-20 hidden h-16 w-full items-center justify-between border-b border-[#D8E0EA] bg-white/80 backdrop-blur-md px-8 shadow-xs lg:flex">
      {/* Left: Organization / Portal Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#0F3F7F]" />
          <span className="text-xs font-bold tracking-widest text-[#0F3F7F] uppercase">
            Mustaqbil Bridge
          </span>
        </div>
        <span className="text-[#D8E0EA] font-light">|</span>
        <span className="text-xs font-semibold text-[#64748B]">
          Operations & Volunteer Portal
        </span>
      </div>

      {/* Right: Notification Bell & Profile Quick-Chip */}
      <div className="flex items-center gap-4">
        {/* In-App Notification Bell */}
        <NotificationBell theme="light" />

        <div className="h-6 w-px bg-[#E2E8F0]" />

        {/* Profile Link */}
        <Link
          href="/profile"
          className="group flex items-center gap-2.5 rounded-full border border-[#D8E0EA] bg-[#F8FAFC] py-1 pl-1.5 pr-3 transition hover:border-[#0F3F7F] hover:bg-white"
          title="View profile"
        >
          <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0F3F7F] text-xs font-bold text-[#FFC107]">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="size-7 object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#101828] group-hover:text-[#0F3F7F] transition-colors">
              {displayName.split(' ')[0]}
            </span>
            <span className="rounded-full bg-[#EAF1FF] px-1.5 py-0.2 text-[9px] font-bold capitalize text-[#0F3F7F]">
              {roleText}
            </span>
          </div>
        </Link>
      </div>
    </header>
  )
}
