'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function AddVolunteerDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: 'volunteer', domain: '' })
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const { error } = await res.json()
      setError(error || 'Something went wrong')
      return
    }
    setOpen(false)
    setForm({ full_name: '', email: '', phone: '', role: 'volunteer', domain: '' })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-full bg-[#FFC107] text-[#0F3F7F] hover:bg-[#ffcb2f]">+ Add Volunteer</Button>
        }
      />
      <DialogContent className="border border-[#D8E0EA] bg-white p-0 shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)]">
        <div className="rounded-t-[inherit] bg-[#0F3F7F] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Image src="/Logo_Yellow.svg" alt="Mustaqbil Bridge" width={28} height={28} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">Team access</p>
              <DialogHeader>
                <DialogTitle className="mt-1 text-xl text-white">Add team member</DialogTitle>
              </DialogHeader>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="Full name"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
            />
            <Input
              placeholder="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
            />
            <Input
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
            />
            <Input
              placeholder="Domain (e.g. Design, Outreach)"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
            />
          </div>

          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? 'volunteer' })}>
            <SelectTrigger className="h-11 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          {error && <p className="text-sm text-[#DC2626]">{error}</p>}

          <DialogFooter className="px-0 pb-0 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-[#FFC107] px-5 text-[#0F3F7F] hover:bg-[#ffcb2f]"
            >
              {loading ? 'Sending invite…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
