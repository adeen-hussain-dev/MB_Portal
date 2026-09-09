'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CameraIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  LockIcon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
} from 'lucide-react'

type ProfileData = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  domain: string | null
  status: string | null
  avatar_url: string | null
}

export function ProfileEditor({ profile }: { profile: ProfileData }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarSuccess, setAvatarSuccess] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const displayName = profile.full_name || profile.email || 'User'
  const initial = displayName.charAt(0).toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setAvatarError(null)
    setAvatarSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      setUploadingAvatar(false)

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      setAvatarUrl(data.avatar_url)
      setAvatarSuccess(true)
      router.refresh()
      setTimeout(() => setAvatarSuccess(false), 3500)
    } catch (err: unknown) {
      setUploadingAvatar(false)
      setAvatarError(err instanceof Error ? err.message : 'Upload failed')
      setTimeout(() => setAvatarError(null), 4500)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setUpdatingPassword(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      setUpdatingPassword(false)

      if (error) {
        throw new Error(error.message)
      }

      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3500)
    } catch (err: unknown) {
      setUpdatingPassword(false)
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    }
  }

  return (
    <div className="w-full min-w-0 max-w-4xl space-y-6">
      {/* Photo & Role Header Card */}
      <section className="rounded-[2rem] border border-[#D8E0EA] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFC107] font-bold text-[#0F3F7F] text-2xl shadow-md border-4 border-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="size-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>

            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-[#0F3F7F] text-white shadow-lg transition hover:bg-[#0b3164] disabled:opacity-50"
              title="Change profile photo"
            >
              {uploadingAvatar ? (
                <RefreshCwIcon className="size-4 animate-spin" />
              ) : (
                <CameraIcon className="size-4" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="font-heading text-2xl font-bold text-[#101828]">
                {displayName}
              </h2>
              <span className="rounded-full bg-[#EAF1FF] px-2.5 py-0.5 text-xs font-semibold capitalize text-[#0F3F7F]">
                {profile.role || 'Volunteer'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B]">{profile.email}</p>
            <p className="text-xs text-[#94A3B8]">
              Click the camera icon to upload a new profile photo (max 5MB).
            </p>
          </div>
        </div>

        {avatarSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
            <span>Profile photo updated successfully!</span>
          </div>
        )}

        {avatarError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800">
            <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
            <span>{avatarError}</span>
          </div>
        )}
      </section>

      {/* Read-Only Account Details Card */}
      <section className="rounded-[2rem] border border-[#D8E0EA] bg-white p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold text-[#101828]">
              Personal Information
            </h3>
            <p className="text-xs text-[#64748B]">
              These fields are managed by administrators and cannot be self-edited.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            <LockIcon className="size-3" /> Read-Only
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              Full Name
            </label>
            <Input
              value={profile.full_name || ''}
              readOnly
              disabled
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] text-xs sm:text-sm font-medium text-[#101828] cursor-not-allowed opacity-90"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              Email Address
            </label>
            <Input
              value={profile.email || ''}
              readOnly
              disabled
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] text-xs sm:text-sm font-medium text-[#101828] cursor-not-allowed opacity-90"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              Role
            </label>
            <Input
              value={(profile.role || 'volunteer').toUpperCase()}
              readOnly
              disabled
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] text-xs sm:text-sm font-medium text-[#101828] cursor-not-allowed opacity-90"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              Domain / Designation
            </label>
            <Input
              value={profile.domain || 'Not assigned'}
              readOnly
              disabled
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] text-xs sm:text-sm font-medium text-[#101828] cursor-not-allowed opacity-90"
            />
          </div>
        </div>
      </section>

      {/* Change Password Card */}
      <section className="rounded-[2rem] border border-[#D8E0EA] bg-white p-6 sm:p-8 shadow-sm space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-[#0F3F7F]" />
            <h3 className="font-heading text-lg font-semibold text-[#101828]">
              Security & Password
            </h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Update your login password to keep your account secure.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                required
                className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] pr-10 text-xs sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#101828]"
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              Confirm New Password
            </label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] text-xs sm:text-sm"
            />
          </div>

          {passwordSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
              <span>Password updated successfully!</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800">
              <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
              <span>{passwordError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={updatingPassword || !newPassword || !confirmPassword}
            className="rounded-xl bg-[#0F3F7F] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0b3164] disabled:opacity-50"
          >
            {updatingPassword ? (
              <span className="flex items-center gap-2">
                <RefreshCwIcon className="size-3.5 animate-spin" /> Updating Password...
              </span>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </section>
    </div>
  )
}
