'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallback() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
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
    const { error } = await createClient().auth.updateUser({ password })
    if (error) {
      setError(error.message)
      return
    }
    router.push('/')
  }

  if (error) return <p>Ye link expire ho gaya ya invalid hai - admin se dobara invite mangwao. ({error})</p>
  if (!ready) return <p>Verifying...</p>

  return (
    <form onSubmit={handleSetPassword} className="flex max-w-sm flex-col gap-3 p-6">
      <p>Apna password set karo:</p>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      <button type="submit">Set password and continue</button>
    </form>
  )
}
