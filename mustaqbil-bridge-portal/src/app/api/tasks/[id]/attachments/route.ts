import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addTaskAttachment } from '@/lib/portal-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('task_attachments')
    .select('*')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const attachments = (data ?? []).map((a) => {
    const url = String(a.file_url || '')
    const name = String(a.file_name || url.split('/').pop() || 'Attachment')
    const type = (a.attachment_type === 'link' || (!a.attachment_type && (url.includes('drive.google.com') || url.includes('youtube.com') || url.includes('youtu.be'))))
      ? 'link'
      : 'file'
    const purpose = (a.purpose === 'submission' ? 'submission' : 'reference') as 'reference' | 'submission'
    return {
      id: a.id,
      taskId: a.task_id,
      fileName: name,
      fileUrl: url,
      attachmentType: type,
      purpose,
      uploadedBy: a.uploaded_by,
      createdAt: a.created_at,
    }
  })

  return NextResponse.json({ attachments })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdminOrManager = profile && ['admin', 'manager'].includes(profile.role ?? '')

  // Check task access
  const { data: task } = await admin
    .from('tasks')
    .select('id, assignee_id, status')
    .eq('id', taskId)
    .maybeSingle()

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (task.status === 'done') {
    return NextResponse.json(
      { error: 'Cannot add attachments to a completed task' },
      { status: 400 }
    )
  }

  if (!isAdminOrManager && task.assignee_id !== user.id) {
    return NextResponse.json(
      { error: 'You do not have permission to add attachments to this task' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const fileUrl = body.fileUrl || body.file_url
  const fileName = body.fileName || body.file_name
  const attachmentType = body.attachmentType || body.attachment_type
  // If volunteer is uploading, purpose is ALWAYS 'submission'. If admin/manager, defaults to body.purpose || 'submission'
  const purpose = (!isAdminOrManager) ? 'submission' : (body.purpose || 'submission')

  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.trim()) {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
  }

  try {
    const attachment = await addTaskAttachment({
      taskId,
      fileUrl: fileUrl.trim(),
      fileName: fileName ? String(fileName).trim() : undefined,
      attachmentType: attachmentType === 'link' ? 'link' : 'file',
      purpose: purpose === 'reference' ? 'reference' : 'submission',
      uploadedBy: user.id,
    })

    return NextResponse.json({ success: true, attachment }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add attachment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
