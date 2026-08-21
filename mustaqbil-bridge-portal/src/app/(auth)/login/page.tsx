'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const lightLogoStyle = {
  filter: 'brightness(0) saturate(100%) invert(15%) sepia(66%) saturate(1848%) hue-rotate(192deg) brightness(92%) contrast(101%)',
  width: 'auto',
  height: 'auto',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      return
    }
    router.replace('/tasks')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 py-12 text-[#101828]">
      <div className="page-fade w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
        <div className="flex flex-col items-center text-center">
          <Image src="/MB_Logo.svg" alt="Mustaqbil Bridge" width={176} height={62} style={lightLogoStyle} priority />
          <h1 className="mt-8 font-heading text-3xl font-semibold tracking-tight">Sign in to the portal</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">Invite-only access for the Mustaqbil Bridge team.</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
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

          <label className="block text-sm font-medium text-[#101828]">
            <span className="mb-2 block text-[#64748B]">Password</span>
            <input
              className="w-full rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F3F7F] focus:bg-white"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <p className="text-sm text-[#DC2626]">{error}</p>}

          <button className="w-full rounded-xl bg-[#FFC107] px-4 py-3 font-semibold text-[#0F3F7F] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_-20px_rgba(15,63,127,0.45)]" type="submit">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#64748B]">Need access? Ask an admin to send you an invite.</p>

        <Link href="/" className="mt-4 inline-block text-sm font-medium text-[#0F3F7F] hover:text-[#123f79]">
          Back to home
        </Link>
      </div>
    </main>
  )
}
