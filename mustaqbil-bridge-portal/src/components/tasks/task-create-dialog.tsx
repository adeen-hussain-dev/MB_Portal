'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TaskPriority } from '@/lib/task-store'

type Assignee = {
  id: string
  full_name: string
  email: string
  role?: string | null
  domain?: string | null
  status?: string | null
}

type TaskCreateDialogProps = {
  assignees: Assignee[]
  onCreated: (task: {
    id: string
    title: string
    description: string
    domain: string
    assigneeName: string
    assigneeEmail: string
    priority: TaskPriority
    dueDate: string
    status: 'todo'
    createdAt: string
    attachments: string[]
  }) => void
}

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export function TaskCreateDialog({ assignees, onCreated }: TaskCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigneeEmail: assignees[0]?.email ?? '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
    domain: '',
  })

  const selectedAssignee = useMemo(
    () => assignees.find((assignee) => assignee.email === form.assigneeEmail),
    [assignees, form.assigneeEmail],
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setError('')
    if (file && file.size > 20 * 1024 * 1024) {
      setError('File size exceeds the 20MB limit.')
      setSelectedFile(null)
      e.target.value = ''
      return
    }
    setSelectedFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const uploadedAttachments: string[] = []

    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError('File size exceeds the 20MB limit.')
        setLoading(false)
        return
      }

      try {
        const uploadFormData = new FormData()
        uploadFormData.append('file', selectedFile)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadRes.ok) {
          const errPayload = await uploadRes.json()
          setError(errPayload.error || 'File upload failed')
          setLoading(false)
          return
        }

        const uploadResult = await uploadRes.json()
        if (uploadResult.url) {
          uploadedAttachments.push(uploadResult.url)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setError(`Attachment upload failed: ${msg}`)
        setLoading(false)
        return
      }
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        assigneeName: selectedAssignee?.full_name ?? 'Unassigned',
        assigneeEmail: selectedAssignee?.email ?? '',
        attachments: uploadedAttachments,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const payload = await res.json()
      setError(payload.error || 'Something went wrong')
      return
    }

    const createdTask = await res.json()
    onCreated(createdTask)
    setOpen(false)
    setSelectedFile(null)
    setForm({
      title: '',
      description: '',
      assigneeEmail: assignees[0]?.email ?? '',
      priority: 'medium',
      dueDate: '',
      domain: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-xl bg-[#FFC107] px-4 py-2.5 font-semibold text-[#0F3F7F] hover:bg-[#ffcb2f]">
            + New task
          </Button>
        }
      />

      <DialogContent className="border border-[#D8E0EA] bg-white p-0 shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)] sm:max-w-2xl">
        <div className="bg-[#0F3F7F] px-6 py-5 text-white">
          <DialogHeader>
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Module 5</p>
            <DialogTitle className="mt-2 font-heading text-2xl text-white">Create and assign a task</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-white/80">
              Add the title, owner, priority, due date, and supporting file before sending it to the queue.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Task title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
            />
            <Input
              placeholder="Domain"
              required
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
            />
          </div>

          <textarea
            placeholder="Task description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="min-h-28 w-full rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 text-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F3F7F] focus:bg-white"
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={form.assigneeEmail}
              onValueChange={(value) => setForm({ ...form, assigneeEmail: value ?? assignees[0]?.email ?? '' })}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4">
                <SelectValue placeholder="Assign to" />
              </SelectTrigger>
              <SelectContent>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.email} value={assignee.email}>
                    {assignee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value as TaskPriority })}>
              <SelectTrigger className="h-11 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              required
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
            />
          </div>

          <label className="block text-sm font-medium text-[#101828]">
            <span className="mb-2 block text-[#64748B]">Attachment upload (max 20MB)</span>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full cursor-pointer rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 text-sm text-[#64748B] file:mr-4 file:rounded-lg file:border-0 file:bg-[#0F3F7F] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            <span className="mt-2 block text-xs text-[#64748B]">File will be uploaded directly to Supabase Storage bucket &apos;task-attachments&apos;.</span>
          </label>

          {selectedFile && (
            <p className="text-sm text-[#0F3F7F]">Selected file: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</p>
          )}

          {error && <p className="text-sm text-[#DC2626]">{error}</p>}

          <DialogFooter className="px-0 pb-0 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-[#FFC107] px-5 text-[#0F3F7F] hover:bg-[#ffcb2f]"
            >
              {loading ? 'Creating task...' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
