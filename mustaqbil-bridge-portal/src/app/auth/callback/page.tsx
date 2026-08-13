'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const lightLogoStyle = {
  filter: 'brightness(0) saturate(100%) invert(15%) sepia(66%) saturate(1848%) hue-rotate(192deg) brightness(92%) contrast(101%)',
}

export default function AuthCallback() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const err = params.get('error_description')

    if (err) {
      setError(err.replace(/\+/g, ' '))
      return
    }

    if (!access_token || !refresh_token) {
      setError('Invalid or missing link')
      return
    }

    createClient().auth.setSession({ access_token, refresh_token }).then(({ error }) => {
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

    router.replace('/tasks')
    router.refresh()
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 py-12 text-[#101828]">
        <div className="w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 text-center shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
          <Image src="/MB_Logo.svg" alt="Mustaqbil Bridge" width={176} height={62} className="mx-auto" style={lightLogoStyle} priority />
          <h1 className="mt-8 font-heading text-2xl font-semibold">Invite link issue</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            This link looks invalid or expired. Ask an admin to send a fresh invite.
          </p>
          <p className="mt-4 rounded-xl bg-[#F5F7FA] px-4 py-3 text-sm text-[#DC2626]">{error}</p>
        </div>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 py-12 text-[#101828]">
        <div className="w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 text-center shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
          <Image src="/MB_Logo.svg" alt="Mustaqbil Bridge" width={176} height={62} className="mx-auto" style={lightLogoStyle} priority />
          <h1 className="mt-8 font-heading text-2xl font-semibold">Verifying invite</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">Please wait while we confirm your invite and prepare your account.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 py-12 text-[#101828]">
      <form onSubmit={handleSetPassword} className="w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
        <div className="text-center">
          <Image src="/MB_Logo.svg" alt="Mustaqbil Bridge" width={176} height={62} className="mx-auto" style={lightLogoStyle} priority />
          <h1 className="mt-8 font-heading text-2xl font-semibold">Set your password</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">Choose a password for your invited Mustaqbil Bridge account.</p>
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
          {loading ? 'Saving password...' : 'Set password and continue'}
        </button>
      </form>
    </main>
  )
}
