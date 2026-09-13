'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallback() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const searchParams = new URLSearchParams(window.location.search)

    const access_token = hashParams.get('access_token') || searchParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token')
    const code = searchParams.get('code')
    const err = hashParams.get('error_description') || searchParams.get('error_description') || searchParams.get('error')
    const type = hashParams.get('type') || searchParams.get('type')

    if (type === 'recovery') {
      setIsRecovery(true)
    }

    if (err) {
      setError(err.replace(/\+/g, ' '))
      return
    }

    const supabase = createClient()

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError(error.message)
        else setReady(true)
      })
      return
    }

    if (!access_token || !refresh_token) {
      // Check if session already exists (e.g., set by supabase client via cookie or background exchange)
      supabase.auth.getSession().then(({ data, error }) => {
        if (error || !data.session) {
          setError('Invalid or missing link')
        } else {
          setReady(true)
        }
      })
      return
    }

    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) setError(error.message)
      else setReady(true)
    })
  }, [])

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.replace('/overview')
    router.refresh()
  }

  if (error) {
    const isPkceError = error.toLowerCase().includes('pkce code verifier')
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 py-12 text-[#101828]">
        <div className="w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 text-center shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
          <Image src="/MB_Logo.svg" alt="Mustaqbil Bridge" width={176} height={53} className="mx-auto h-10 w-auto" priority />
          <h1 className="mt-8 font-heading text-2xl font-semibold">
            {isRecovery || isPkceError ? 'Password reset link issue' : 'Invite link issue'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            {isPkceError
              ? 'This reset link was opened in a different browser or expired. Please request a fresh password reset link from the login page.'
              : isRecovery
              ? 'This reset link looks invalid or expired. Please request a new password reset link from the login page.'
              : 'This link looks invalid or expired. Ask an admin to send a fresh invite.'}
          </p>
          <p className="mt-4 rounded-xl bg-[#F5F7FA] px-4 py-3 text-sm text-[#DC2626]">
            {isPkceError ? 'Browser session mismatch. Please request a fresh link below.' : error}
          </p>
          <a
            href="/login"
            className="mt-6 inline-block w-full rounded-xl bg-[#0F3F7F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3266]"
          >
            Go to Login & Request Fresh Link
          </a>
        </div>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 py-12 text-[#101828]">
        <div className="w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 text-center shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
          <Image src="/MB_Logo.svg" alt="Mustaqbil Bridge" width={176} height={53} className="mx-auto h-10 w-auto" priority />
          <h1 className="mt-8 font-heading text-2xl font-semibold">
            {isRecovery ? 'Verifying reset link' : 'Verifying invite'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            {isRecovery
              ? 'Please wait while we verify your password reset request.'
              : 'Please wait while we confirm your invite and prepare your account.'}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 py-12 text-[#101828]">
      <form onSubmit={handleSetPassword} className="w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
        <div className="text-center">
          <Image src="/MB_Logo.svg" alt="Mustaqbil Bridge" width={176} height={53} className="mx-auto h-10 w-auto" priority />
          <h1 className="mt-8 font-heading text-2xl font-semibold">
            {isRecovery ? 'Reset your password' : 'Set your password'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            {isRecovery
              ? 'Choose a new password for your Mustaqbil Bridge account.'
              : 'Choose a password for your invited Mustaqbil Bridge account.'}
          </p>
        </div>

        <label className="mt-8 block text-sm font-medium text-[#101828]">
          <span className="mb-2 block text-[#64748B]">New password</span>
          <input
            type="password"
            placeholder="Enter a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F3F7F] focus:bg-white"
          />
        </label>

        {error && <p className="mt-4 text-sm text-[#DC2626]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-[#FFC107] px-4 py-3 font-semibold text-[#0F3F7F] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_-20px_rgba(15,63,127,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Saving password...' : isRecovery ? 'Update password and continue' : 'Set password and continue'}
        </button>
      </form>
    </main>
  )
}
