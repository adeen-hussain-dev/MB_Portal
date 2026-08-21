'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type CommentComposerProps = {
  taskId: string
}

export function CommentComposer({ taskId }: CommentComposerProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, content: content.trim() }),
      })

      setLoading(false)

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to post comment')
        return
      }

      setContent('')
      router.refresh()
    } catch (err) {
      setLoading(false)
      const msg = err instanceof Error ? err.message : 'Error posting comment'
      setError(msg)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <textarea
        placeholder="Add a comment to this task..."
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-24 w-full rounded-2xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 text-sm text-[#101828] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F3F7F] focus:bg-white"
      />
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || !content.trim()}
          className="rounded-xl bg-[#0F3F7F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123f79] disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post comment'}
        </Button>
      </div>
    </form>
  )
}
