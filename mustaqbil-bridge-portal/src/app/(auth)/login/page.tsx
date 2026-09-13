'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.status?.toLowerCase() === 'inactive') {
        await supabase.auth.signOut()
        setError('Your access has been suspended — contact an admin.')
        setLoading(false)
        return
      }
    }

    const destination = redirectTo && redirectTo.startsWith('/') && redirectTo !== '/' ? redirectTo : '/overview'
    router.replace(destination)
    router.refresh()
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json().catch(() => ({}))
      setLoading(false)

      if (!res.ok) {
        setError(data.error || 'Failed to send reset link')
        return
      }

      setSuccessMessage('Password reset link sent! Please check your email inbox to proceed.')
    } catch {
      setLoading(false)
      setError('An unexpected error occurred while sending the reset link.')
    }
  }

  if (isForgotPassword) {
    return (
      <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
        <div className="rounded-xl bg-[#EAF1FF] p-4 text-xs leading-5 text-[#0F3F7F]">
          Enter your registered email address. We&apos;ll send you a secure link to reset your password.
        </div>

        <label className="block text-sm font-medium text-[#101828]">
          <span className="mb-2 block text-[#64748B]">Account Email</span>
          <input
            className="w-full rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F3F7F] focus:bg-white"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="volunteer@example.com"
            required
          />
        </label>

        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            {successMessage}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-[#FFC107] px-4 py-3 font-semibold text-[#0F3F7F] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_-20px_rgba(15,63,127,0.45)] disabled:opacity-50"
          type="submit"
        >
          {loading ? 'Sending reset link...' : 'Send reset link'}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsForgotPassword(false)
            setError('')
            setSuccessMessage('')
          }}
          className="w-full py-2 text-center text-xs font-medium text-[#64748B] hover:text-[#101828] transition"
        >
          ← Back to sign in
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleLogin} className="mt-8 space-y-4">
      {searchParams.get('error') === 'suspended' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          Your access has been suspended — contact an admin.
        </div>
      )}
      <label className="block text-sm font-medium text-[#101828]">
        <span className="mb-2 block text-[#64748B]">Email</span>
        <input
          className="w-full rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F3F7F] focus:bg-white"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="volunteer@example.com"
          required
        />
      </label>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="block text-sm font-medium text-[#64748B]">Password</span>
          <button
            type="button"
            onClick={() => {
              setIsForgotPassword(true)
              setError('')
              setSuccessMessage('')
            }}
            className="text-xs font-medium text-[#0F3F7F] hover:underline focus:outline-none"
          >
            Forgot password?
          </button>
        </div>
        <input
          className="w-full rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F3F7F] focus:bg-white"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      {error && <p className="text-sm text-[#DC2626]">{error}</p>}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-[#FFC107] px-4 py-3 font-semibold text-[#0F3F7F] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_-20px_rgba(15,63,127,0.45)] disabled:opacity-50"
        type="submit"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 py-12 text-[#101828]">
      <div className="page-fade w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <Image
              src="/MB_Logo.svg"
              alt="Mustaqbil Bridge"
              width={176}
              height={53}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <h1 className="mt-8 font-heading text-3xl font-semibold tracking-tight">Sign in to the portal</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">Invite-only access for the Mustaqbil Bridge team.</p>
        </div>

        <Suspense fallback={<div className="py-8 text-center text-sm text-[#64748B]">Loading sign-in form...</div>}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-[#64748B]">Need access? Ask an admin to send you an invite.</p>

        <Link href="/" className="mt-4 inline-block text-sm font-medium text-[#0F3F7F] hover:text-[#123f79]">
          Back to home
        </Link>
      </div>
    </main>
  )
}
