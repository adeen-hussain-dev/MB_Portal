import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendQuestionAnsweredEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 1. Verify caller has admin or manager role
  let role = ''
  const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (userProfile?.role) {
    role = userProfile.role
  } else {
    const { data: adminProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    role = adminProfile?.role || ''
  }

  if (!['admin', 'manager'].includes(role)) {
    return NextResponse.json(
      { error: 'Only admins and managers can answer volunteer questions' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { answer } = body

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ error: 'Answer content cannot be empty' }, { status: 400 })
    }

    // 2. Fetch target question
    const { data: existingQuestion, error: lookupErr } = await admin
      .from('task_questions')
      .select('*, tasks!task_questions_task_id_fkey(title)')
      .eq('id', id)
      .maybeSingle()

    if (lookupErr || !existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const answeredAt = new Date().toISOString()

    // 3. Update the question row
    const { data: updatedQuestion, error: updateErr } = await admin
      .from('task_questions')
      .update({
        answer: answer.trim(),
        answered_by: user.id,
        status: 'answered',
        answered_at: answeredAt,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    // 4. Send email notification to the volunteer who asked
    let answeredByName = 'Manager'
    try {
      const [volunteerRes, managerRes] = await Promise.all([
        admin.from('profiles').select('full_name, email').eq('id', existingQuestion.asked_by).single(),
        admin.from('profiles').select('full_name').eq('id', user.id).single(),
      ])

      if (managerRes.data?.full_name) {
        answeredByName = managerRes.data.full_name
      }

      const taskTitle = (existingQuestion.tasks as { title?: string } | null)?.title || 'Assigned Task'

      if (volunteerRes.data?.email) {
        await sendQuestionAnsweredEmail({
          taskId: existingQuestion.task_id,
          taskTitle,
          question: existingQuestion.question,
          answer: answer.trim(),
          volunteerName: volunteerRes.data.full_name || 'Volunteer',
          volunteerEmail: volunteerRes.data.email,
          answeredByName,
        })
      }

      // In-App Notification: Dispatch to volunteer who asked
      if (existingQuestion.asked_by) {
        try {
          await createNotification({
            userId: existingQuestion.asked_by,
            type: 'question_answered',
            title: 'Question Answered',
            body: `${answeredByName} answered your question on "${taskTitle}".`,
            taskId: existingQuestion.task_id,
          })
        } catch (notifErr) {
          console.error('[Questions API] Failed to create answer notification:', notifErr)
        }
      }
    } catch (emailErr) {
      console.error('[Questions API] Failed to send answer notification:', emailErr)
    }

    return NextResponse.json(
      {
        message: 'Question answered successfully',
        question: {
          ...updatedQuestion,
          answeredByName,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
