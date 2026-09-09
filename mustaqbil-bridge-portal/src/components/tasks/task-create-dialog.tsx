'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TaskPriority } from '@/lib/task-store'
import { PlusIcon, Trash2Icon } from 'lucide-react'

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

const defaultDomains = [
  'Graphic Design',
  'Web Development',
  'Content & Copywriting',
  'Social Media & Outreach',
  'Video Editing',
  'Event Management',
]

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
  
  // Domains list & domain manager state
  const [domains, setDomains] = useState<string[]>(defaultDomains)
  const [showDomainManager, setShowDomainManager] = useState(false)
  const [newDomainInput, setNewDomainInput] = useState('')
  const [domainLoading, setDomainLoading] = useState(false)

  // Filter so ONLY volunteers are assignable (managers review, volunteers execute)
  const volunteerAssignees = useMemo(
    () => assignees.filter((assignee) => assignee.role === 'volunteer'),
    [assignees],
  )

  // Form initialized with empty/null values — NO prefilled defaults
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigneeEmail: '',
    priority: '' as TaskPriority | '',
    dueDate: '',
    domain: '',
  })

  const [videoLink, setVideoLink] = useState('')
  const [videoLabel, setVideoLabel] = useState('')

  // Load domains from API when dialog opens
  useEffect(() => {
    if (open) {
      fetch('/api/domains')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.domains) && data.domains.length > 0) {
            setDomains(data.domains)
          }
        })
        .catch(() => {})
    }
  }, [open])

  const selectedAssignee = useMemo(
    () => volunteerAssignees.find((assignee) => assignee.email === form.assigneeEmail),
    [volunteerAssignees, form.assigneeEmail],
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

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault()
    if (!newDomainInput.trim()) return

    const name = newDomainInput.trim()
    setDomainLoading(true)

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      setDomainLoading(false)

      if (res.ok) {
        setDomains((prev) => Array.from(new Set([...prev, name])))
        setForm((f) => ({ ...f, domain: name }))
        setNewDomainInput('')
        setShowDomainManager(false)
      }
    } catch {
      setDomainLoading(false)
    }
  }

  async function handleDeleteDomain(nameToDelete: string) {
    try {
      await fetch('/api/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameToDelete }),
      })
      setDomains((prev) => prev.filter((d) => d !== nameToDelete))
      if (form.domain === nameToDelete) {
        setForm((f) => ({ ...f, domain: '' }))
      }
    } catch {
      // Ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.assigneeEmail) {
      setError('Please select an assignee.')
      return
    }
    if (!form.domain) {
      setError('Please select a domain/field.')
      return
    }
    if (!form.priority) {
      setError('Please select a priority level.')
      return
    }
    if (!form.dueDate) {
      setError('Please select a due date.')
      return
    }

    setLoading(true)
    setError('')

    const uploadedAttachments: Array<{ fileUrl: string; fileName: string; attachmentType: 'file' | 'link' }> = []

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
          uploadedAttachments.push({
            fileUrl: uploadResult.url,
            fileName: selectedFile.name,
            attachmentType: 'file',
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setError(`Attachment upload failed: ${msg}`)
        setLoading(false)
        return
      }
    }

    if (videoLink.trim()) {
      uploadedAttachments.push({
        fileUrl: videoLink.trim(),
        fileName: videoLabel.trim() || 'Video Submission Link',
        attachmentType: 'link',
      })
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        assigneeId: selectedAssignee?.id,
        assigneeName: selectedAssignee?.full_name ?? 'Volunteer',
        assigneeEmail: selectedAssignee?.email ?? form.assigneeEmail,
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
    setVideoLink('')
    setVideoLabel('')
    setForm({
      title: '',
      description: '',
      assigneeEmail: '',
      priority: '',
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

      <DialogContent className="w-[calc(100%-1.5rem)] border border-[#D8E0EA] bg-white p-0 shadow-[0_28px_80px_-48px_rgba(15,63,127,0.42)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <div className="bg-[#0F3F7F] px-4 py-4 sm:px-6 sm:py-5 text-white shrink-0">
          <DialogHeader>
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">Module 5</p>
            <DialogTitle className="mt-1 font-heading text-xl sm:text-2xl text-white">Create and assign a task</DialogTitle>
            <DialogDescription className="mt-1 text-xs sm:text-sm text-white/80">
              Fill in all task details, assign to a team volunteer, and attach supporting files.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Task Title *
              </label>
              <Input
                placeholder="Enter title..."
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Domain / Field *
                </label>
                <button
                  type="button"
                  onClick={() => setShowDomainManager(!showDomainManager)}
                  className="text-xs font-semibold text-[#0F3F7F] hover:underline"
                >
                  {showDomainManager ? 'Close manager' : '+ Add domain'}
                </button>
              </div>

              {showDomainManager ? (
                <div className="rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New domain name..."
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value)}
                      className="h-9 rounded-lg border-[#D8E0EA] bg-white text-xs"
                    />
                    <Button
                      type="button"
                      onClick={handleAddDomain}
                      disabled={domainLoading || !newDomainInput.trim()}
                      className="h-9 rounded-lg bg-[#0F3F7F] px-3 text-xs text-white"
                    >
                      {domainLoading ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                    {domains.map((d) => (
                      <div key={d} className="flex items-center justify-between text-xs text-[#101828] bg-white px-2 py-1 rounded">
                        <span>{d}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDomain(d)}
                          className="text-[#DC2626] hover:opacity-75"
                        >
                          <Trash2Icon className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Select value={form.domain} onValueChange={(val) => setForm({ ...form, domain: val ?? '' })}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4">
                    <SelectValue placeholder="Select domain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Description *
            </label>
            <textarea
              placeholder="Describe the task instructions, requirements, and deliverables..."
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-20 sm:min-h-24 w-full rounded-xl border border-[#D8E0EA] bg-[#F5F7FA] px-4 py-3 text-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#0F3F7F] focus:bg-white"
            />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Assign To *
              </label>
              <Select
                value={form.assigneeEmail}
                onValueChange={(value) => setForm({ ...form, assigneeEmail: value ?? '' })}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4">
                  <SelectValue placeholder="Select volunteer...">
                    {selectedAssignee ? selectedAssignee.full_name : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {volunteerAssignees.map((assignee) => (
                    <SelectItem key={assignee.email} value={assignee.email}>
                      {assignee.full_name || 'Unnamed Volunteer'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Priority *
              </label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm({ ...form, priority: value as TaskPriority })}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4">
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Due Date *
              </label>
              <Input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="h-11 rounded-xl border-[#D8E0EA] bg-[#F5F7FA] px-4"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#D8E0EA] bg-[#F8FAFC] p-4 space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Supporting Files (Images, PDF, Excel, Word — Max 20MB)
              </label>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                onChange={handleFileChange}
                className="block w-full cursor-pointer rounded-xl border border-[#D8E0EA] bg-white px-4 py-2 text-xs text-[#64748B] file:mr-4 file:rounded-lg file:border-0 file:bg-[#0F3F7F] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
              />
              {selectedFile && (
                <p className="mt-1 text-xs font-medium text-[#0F3F7F]">
                  Selected file: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Video / Reel Link (Google Drive or YouTube)
                </label>
                <span className="text-[10px] text-[#0F3F7F] font-semibold bg-[#EAF1FF] px-2 py-0.5 rounded-full">
                  Hybrid Storage
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                To conserve storage, paste a Google Drive share link or unlisted YouTube link instead of uploading large video files.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="url"
                  placeholder="https://drive.google.com/... or https://youtube.com/..."
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  className="h-10 rounded-xl border-[#D8E0EA] bg-white text-xs"
                />
                <Input
                  type="text"
                  placeholder="Link Label (e.g. Campaign Reel Draft)"
                  value={videoLabel}
                  onChange={(e) => setVideoLabel(e.target.value)}
                  className="h-10 rounded-xl border-[#D8E0EA] bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm font-semibold text-[#DC2626]">{error}</p>}

          <DialogFooter className="px-0 pb-0 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full sm:w-auto rounded-xl bg-[#FFC107] px-6 text-sm font-semibold text-[#0F3F7F] hover:bg-[#ffcb2f]"
            >
              {loading ? 'Creating task...' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
