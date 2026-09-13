import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addTaskAttachment, deleteTask, fetchTaskById, updateTask } from '@/lib/portal-data'
import { sendTaskAssignedEmail } from '@/lib/email'
import { createNotification, createNotifications } from '@/lib/notifications'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const task = await fetchTaskById(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Task not found'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  let profile = null
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (userProfile) {
    profile = userProfile
  } else {
    const admin = createAdminClient()
    const { data: adminProfile } = await admin
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()
    profile = adminProfile
  }

  const isAdminOrManager = profile && ['admin', 'manager'].includes(profile.role ?? '')
  const body = await request.json();

  if (!isAdminOrManager) {
    const admin = createAdminClient()
    const { data: existingTask } = await admin
      .from('tasks')
      .select('assignee_id, status')
      .eq('id', id)
      .maybeSingle()

    if (!existingTask || existingTask.assignee_id !== user.id) {
      return NextResponse.json(
        { error: 'Only admin, manager, or the task assignee can update this task' },
        { status: 403 }
      )
    }

    if (body.status && ['done', 'changes_requested'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Volunteers cannot approve or request changes on tasks' },
        { status: 403 }
      )
    }

    if (body.assignee_id && body.assignee_id !== user.id) {
      return NextResponse.json(
        { error: 'Volunteers cannot reassign tasks' },
        { status: 403 }
      )
    }
  }
  const patchData: Record<string, unknown> = { ...body }
  const changeReason = body.reason || body.rejection_reason || body.comment
  const lateReason = body.late_reason || body.reason || body.comment

  const admin = createAdminClient()
  const { data: existingTask } = await admin
    .from('tasks')
    .select('status, assignee_id, due_date')
    .eq('id', id)
    .single()

  if (existingTask?.status === 'done') {
    if (body.status !== undefined || body.assignee_id !== undefined || body.assigneeId !== undefined) {
      return NextResponse.json(
        { error: 'Completed tasks are in a terminal state and cannot be modified' },
        { status: 400 }
      )
    }
  }

  const todayPkt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const isLate = Boolean(existingTask?.due_date && todayPkt > existingTask.due_date)

  if (body.status === 'in_review') {
    // If a submission attachment was provided directly in this PATCH request, insert it first
    const subAtt = body.submission_attachment || body.submissionAttachment || body.submission
    if (subAtt) {
      const fileUrl = typeof subAtt === 'string' ? subAtt : (subAtt.fileUrl || subAtt.file_url)
      const fileName = typeof subAtt === 'object' ? (subAtt.fileName || subAtt.file_name) : undefined
      const attType = typeof subAtt === 'object' ? (subAtt.attachmentType || subAtt.attachment_type) : undefined
      if (fileUrl) {
        await addTaskAttachment({
          taskId: id,
          fileUrl,
          fileName,
          attachmentType: attType,
          purpose: 'submission',
          uploadedBy: user.id,
        })
      }
    } else if (body.file_url || body.fileUrl) {
      await addTaskAttachment({
        taskId: id,
        fileUrl: body.file_url || body.fileUrl,
        fileName: body.file_name || body.fileName,
        attachmentType: body.attachment_type || body.attachmentType,
        purpose: 'submission',
        uploadedBy: user.id,
      })
    }

    // Verify that at least one submission attachment exists for this task
    const { count: submissionCount } = await admin
      .from('task_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', id)
      .eq('purpose', 'submission')

    const hasSubmission = Boolean(submissionCount && submissionCount > 0)
    const hasLateReason = Boolean(lateReason && typeof lateReason === 'string' && lateReason.trim())

    if (!hasSubmission) {
      return NextResponse.json(
        { error: 'At least one submission attachment is required before submitting for review' },
        { status: 400 }
      )
    }

    if (isLate && !hasLateReason) {
      return NextResponse.json(
        { error: 'A reason is required for late submission' },
        { status: 400 }
      )
    }

    delete patchData.late_reason
    delete patchData.reason
    delete patchData.comment
    delete patchData.submission_attachment
    delete patchData.submissionAttachment
    delete patchData.submission
    delete patchData.file_url
    delete patchData.fileUrl
    delete patchData.file_name
    delete patchData.fileName
    delete patchData.attachment_type
    delete patchData.attachmentType
  }

  if (body.status === 'changes_requested') {
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Only admins and managers can request changes' }, { status: 403 })
    }
    if (!changeReason || typeof changeReason !== 'string' || !changeReason.trim()) {
      return NextResponse.json({ error: 'A reason is required to request changes' }, { status: 400 })
    }
    delete patchData.reason
    delete patchData.rejection_reason
    delete patchData.comment
  }

  if (body.status === 'done') {
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Only admins and managers can approve tasks' }, { status: 403 })
    }

    const rawRating = body.satisfaction_rating
    const rating = Number(rawRating)

    if (
      rawRating === undefined ||
      rawRating === null ||
      isNaN(rating) ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 10
    ) {
      return NextResponse.json(
        { error: 'A satisfaction rating between 1 and 10 is mandatory to approve this task' },
        { status: 400 }
      )
    }

    patchData.satisfaction_rating = rating
    patchData.approved_by = user.id
    patchData.approved_at = new Date().toISOString()
  }

  try {
    const oldStatus = existingTask?.status

    let task

    try {
      task = await updateTask(id, patchData)
    } catch (err) {
      // If satisfaction_rating column doesn't exist yet in Supabase schema, retry without it
      // but PRESERVE approved_by and approved_at so completion metrics and dates are recorded!
      if (patchData.satisfaction_rating !== undefined) {
        delete patchData.satisfaction_rating
        task = await updateTask(id, patchData)
      } else {
        throw err
      }
    }

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // If task was reassigned to a new volunteer, send email notification
    if (body.assignee_id && body.assignee_id !== existingTask?.assignee_id) {
      try {
        const { data: newAssignee } = await admin
          .from('profiles')
          .select('full_name, email')
          .eq('id', body.assignee_id)
          .single()

        if (newAssignee?.email) {
          try {
            await sendTaskAssignedEmail({
              taskId: task.id,
              taskTitle: task.title,
              taskDescription: task.description,
              taskDomain: task.domain,
              taskPriority: task.priority,
              taskDueDate: task.dueDate,
              assigneeName: newAssignee.full_name,
              assigneeEmail: newAssignee.email,
              assignedByName: profile?.full_name || 'Mustaqbil Bridge Team',
            })
          } catch (emailErr) {
            console.error('[Tasks API] Failed to send reassignment email:', emailErr)
          }
        }

        // In-App Notification: Reassigned to new volunteer
        try {
          await createNotification({
            userId: body.assignee_id,
            type: 'task_assigned',
            title: 'Task Assigned',
            body: `You have been assigned to "${task.title}".`,
            taskId: task.id,
          })
        } catch (notifErr) {
          console.error('[Tasks API] Failed to create reassignment notification:', notifErr)
        }
      } catch (assigneeLookupErr) {
        console.warn('Could not lookup new assignee for email notification:', assigneeLookupErr)
      }
    }

    // Insert comment if changes were requested
    if (body.status === 'changes_requested' && changeReason && typeof changeReason === 'string') {
      try {
        await admin.from('task_comments').insert({
          task_id: id,
          user_id: user.id,
          comment: `[Changes Requested]: ${changeReason.trim()}`,
        })
      } catch (commentErr) {
        console.error('Failed to insert rejection comment:', commentErr)
      }
    }

    // Insert comment if moving to in_review after due date (Late Submission)
    if (body.status === 'in_review' && isLate && lateReason && typeof lateReason === 'string') {
      try {
        await admin.from('task_comments').insert({
          task_id: id,
          user_id: user.id,
          comment: `[Late Submission]: ${lateReason.trim()}`,
        })
      } catch (commentErr) {
        console.error('Failed to insert late submission comment:', commentErr)
      }
    }

    // Record into activity_log and dispatch notifications if status changed
    if (body.status && oldStatus && body.status !== oldStatus) {
      try {
        await admin.from('activity_log').insert({
          task_id: id,
          user_id: user.id,
          action: 'status_change',
          old_value: oldStatus,
          new_value: body.status,
        })
      } catch (actErr) {
        console.warn('Failed to insert activity log:', actErr)
      }

      // In-App Notifications for Status Transitions:
      // A. Volunteer submits task for review -> notify admins & managers
      if (body.status === 'in_review') {
        try {
          const { data: staffMembers } = await admin
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'manager'])

          if (staffMembers && staffMembers.length > 0) {
            await createNotifications(
              staffMembers.map((s) => ({
                userId: s.id,
                type: 'task_status',
                title: 'Task In Review',
                body: `"${task.title}" was submitted for review.`,
                taskId: task.id,
              }))
            )
          }
        } catch (notifErr) {
          console.error('Failed to notify staff of in_review status:', notifErr)
        }
      }

      // B. Changes requested -> notify assigned volunteer
      if (body.status === 'changes_requested') {
        const volunteerId = existingTask?.assignee_id || (task as any)?.assigneeId
        if (volunteerId) {
          try {
            await createNotification({
              userId: volunteerId,
              type: 'task_status',
              title: 'Changes Requested',
              body: `Changes were requested on "${task.title}": ${changeReason ? changeReason.trim() : 'Please review comments.'}`,
              taskId: task.id,
            })
          } catch (notifErr) {
            console.error('Failed to notify volunteer of changes_requested:', notifErr)
          }
        }
      }

      // C. Task approved (done) -> notify assigned volunteer
      if (body.status === 'done') {
        const volunteerId = existingTask?.assignee_id || (task as any)?.assigneeId
        if (volunteerId) {
          const ratingText = patchData.satisfaction_rating ? ` with a rating of ${patchData.satisfaction_rating}/10` : ''
          try {
            await createNotification({
              userId: volunteerId,
              type: 'task_status',
              title: 'Task Approved',
              body: `"${task.title}" was approved${ratingText}. Great work!`,
              taskId: task.id,
            })
          } catch (notifErr) {
            console.error('Failed to notify volunteer of done status:', notifErr)
          }
        }
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update task'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can delete tasks' }, { status: 403 })
  }

  try {
    await deleteTask(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete task'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
