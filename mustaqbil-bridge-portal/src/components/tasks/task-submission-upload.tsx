'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UploadCloud, Link as LinkIcon, Loader2, CheckCircle2 } from 'lucide-react'

interface TaskSubmissionUploadProps {
  taskId: string
  onUploaded?: () => void
}

export function TaskSubmissionUpload({ taskId, onUploaded }: TaskSubmissionUploadProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file')

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileSuccess, setFileSuccess] = useState<string | null>(null)

  // Link upload state
  const [videoLink, setVideoLink] = useState('')
  const [videoLabel, setVideoLabel] = useState('')
  const [isSavingLink, setIsSavingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    setFileSuccess(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      setFileError('File size exceeds the 20MB limit.')
      return
    }
    setSelectedFile(file)
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setFileError('Please select a file to upload.')
      return
    }

    setIsUploadingFile(true)
    setFileError(null)
    setFileSuccess(null)

    try {
      // 1. Upload to Supabase Storage via /api/upload
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Failed to upload file')
      }

      const uploadData = await uploadRes.json()
      const fileUrl = uploadData.url
      const fileName = uploadData.name || selectedFile.name

      // 2. Attach to task with purpose='submission'
      const attachRes = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl,
          fileName,
          attachmentType: 'file',
          purpose: 'submission',
        }),
      })

      if (!attachRes.ok) {
        const err = await attachRes.json()
        throw new Error(err.error || 'Failed to attach file to task')
      }

      setFileSuccess('Submission file uploaded successfully!')
      setSelectedFile(null)
      // Reset input element
      const fileInput = document.getElementById('submission-file-input') as HTMLInputElement | null
      if (fileInput) fileInput.value = ''

      if (onUploaded) onUploaded()
      router.refresh()
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoLink.trim()) {
      setLinkError('Please enter a valid link URL.')
      return
    }

    setIsSavingLink(true)
    setLinkError(null)
    setLinkSuccess(null)

    try {
      const attachRes = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: videoLink.trim(),
          fileName: videoLabel.trim() || 'Submission Link',
          attachmentType: 'link',
          purpose: 'submission',
        }),
      })

      if (!attachRes.ok) {
        const err = await attachRes.json()
        throw new Error(err.error || 'Failed to attach link to task')
      }

      setLinkSuccess('Submission link saved successfully!')
      setVideoLink('')
      setVideoLabel('')

      if (onUploaded) onUploaded()
      router.refresh()
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to save link')
    } finally {
      setIsSavingLink(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-[#0F3F7F]/30 bg-[#F8FAFC] p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#101828]">Upload Your Work</h3>
          <p className="text-xs text-[#64748B]">
            Submit files or video links before marking the task in review.
          </p>
        </div>
        <div className="flex rounded-lg bg-[#E2E8F0] p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === 'file'
                ? 'bg-white text-[#0F3F7F] shadow-sm'
                : 'text-[#64748B] hover:text-[#101828]'
            }`}
          >
            <UploadCloud className="size-3.5" />
            File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition ${
              activeTab === 'link'
                ? 'bg-white text-[#0F3F7F] shadow-sm'
                : 'text-[#64748B] hover:text-[#101828]'
            }`}
          >
            <LinkIcon className="size-3.5" />
            Video Link
          </button>
        </div>
      </div>

      {activeTab === 'file' ? (
        <form onSubmit={handleFileUpload} className="space-y-3">
          <div className="space-y-1.5">
            <input
              id="submission-file-input"
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              onChange={handleFileChange}
              disabled={isUploadingFile}
              className="block w-full cursor-pointer rounded-xl border border-[#D8E0EA] bg-white px-3 py-2 text-xs text-[#64748B] file:mr-3 file:rounded-lg file:border-0 file:bg-[#0F3F7F] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
            />
            {selectedFile && (
              <p className="text-xs font-medium text-[#0F3F7F]">
                Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
            <p className="text-[11px] text-[#94A3B8]">
              Images, PDF, Excel, Word, or ZIP up to 20MB.
            </p>
          </div>

          {fileError && (
            <p className="text-xs font-medium text-rose-600">{fileError}</p>
          )}
          {fileSuccess && (
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="size-3.5" /> {fileSuccess}
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={!selectedFile || isUploadingFile}
            className="w-full sm:w-auto bg-[#0F3F7F] text-white hover:bg-[#0b3164] font-semibold text-xs"
          >
            {isUploadingFile ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Uploading Submission...
              </>
            ) : (
              'Upload Submission File'
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLinkSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              type="url"
              placeholder="https://drive.google.com/... or YouTube link"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              disabled={isSavingLink}
              required
              className="h-10 rounded-xl border-[#D8E0EA] bg-white text-xs"
            />
            <Input
              type="text"
              placeholder="Label (e.g. Completed Video Reel)"
              value={videoLabel}
              onChange={(e) => setVideoLabel(e.target.value)}
              disabled={isSavingLink}
              className="h-10 rounded-xl border-[#D8E0EA] bg-white text-xs"
            />
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            Paste a Google Drive share link, YouTube video, or cloud link for your submission.
          </p>

          {linkError && (
            <p className="text-xs font-medium text-rose-600">{linkError}</p>
          )}
          {linkSuccess && (
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="size-3.5" /> {linkSuccess}
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={!videoLink.trim() || isSavingLink}
            className="w-full sm:w-auto bg-[#0F3F7F] text-white hover:bg-[#0b3164] font-semibold text-xs"
          >
            {isSavingLink ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Saving Link...
              </>
            ) : (
              'Save Submission Link'
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
