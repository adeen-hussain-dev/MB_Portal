import nodemailer from 'nodemailer'

export interface TaskAssignmentEmailParams {
  taskId: string
  taskTitle: string
  taskDescription?: string | null
  taskDomain?: string | null
  taskPriority?: string | null
  taskDueDate?: string | null
  assigneeName?: string | null
  assigneeEmail: string
  assignedByName?: string | null
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const user = process.env.SMTP_USER || 'mustaqbilbridge@gmail.com'
  
  const pass = process.env.SMTP_PASS || ''

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  })
}

export async function sendTaskAssignedEmail(params: TaskAssignmentEmailParams) {
  const {
    taskId,
    taskTitle,
    taskDescription,
    taskDomain,
    taskPriority = 'medium',
    taskDueDate,
    assigneeName,
    assigneeEmail,
    assignedByName,
  } = params

  if (!assigneeEmail) {
    console.warn('[Email] Skipping task notification: No assignee email provided.')
    return { success: false, error: 'No assignee email' }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const taskUrl = `${siteUrl}/tasks/${taskId}`
  const fromAddress = process.env.EMAIL_FROM || `Mustaqbil Bridge <${process.env.SMTP_USER || 'mustaqbilbridge@gmail.com'}>`

  const normalizedPriority = (taskPriority || 'medium').toLowerCase()
  const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
    urgent: { bg: '#FEE4E2', text: '#B42318', label: 'Urgent Priority' },
    high: { bg: '#FEF0C7', text: '#B54708', label: 'High Priority' },
    medium: { bg: '#E0F2FE', text: '#026AA2', label: 'Medium Priority' },
    low: { bg: '#F2F4F7', text: '#344054', label: 'Low Priority' },
  }
  const priorityInfo = priorityColors[normalizedPriority] || priorityColors.medium

  const displayName = assigneeName || assigneeEmail.split('@')[0]
  const subject = `[Mustaqbil Bridge] New Task Assigned: "${taskTitle}"`

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #101828; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F7FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #D8E0EA; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 63, 127, 0.08);">
          
          <!-- Top Navy Header Banner -->
          <tr>
            <td style="background-color: #0F3F7F; padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #FFFFFF;">
                      MUSTAQBIL <span style="color: #FFC107;">BRIDGE</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                      Volunteer Operations Portal
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 193, 7, 0.2); border: 1px solid #FFC107; color: #FFC107; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                      New Assignment
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #101828; line-height: 1.3;">
                Hello ${displayName},
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #475467; line-height: 1.6;">
                ${assignedByName ? `<strong>${assignedByName}</strong> has` : 'You have been'} assigned a new task on the Mustaqbil Bridge portal. Please review the task details below.
              </p>

              <!-- Task Card Box -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; margin-bottom: 28px;">
                <!-- Tags Row -->
                <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                  <tr>
                    ${taskDomain ? `
                    <td style="padding-right: 8px;">
                      <span style="display: inline-block; background-color: #EAF1FF; color: #0F3F7F; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 9px; border-radius: 6px;">
                        ${taskDomain}
                      </span>
                    </td>
                    ` : ''}
                    <td>
                      <span style="display: inline-block; background-color: ${priorityInfo.bg}; color: ${priorityInfo.text}; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">
                        ${priorityInfo.label}
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Task Title -->
                <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #101828; line-height: 1.4;">
                  ${taskTitle}
                </h2>

                <!-- Due Date info -->
                ${taskDueDate ? `
                <p style="margin: 0 0 16px 0; font-size: 13px; font-weight: 600; color: #64748B;">
                  <span style="color: #0F3F7F;">Due Date:</span> ${taskDueDate}
                </p>
                ` : ''}

                <!-- Description Preview -->
                ${taskDescription ? `
                <div style="border-top: 1px solid #E2E8F0; padding-top: 14px; margin-top: 12px;">
                  <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B;">
                    Task Overview
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line;">
                    ${taskDescription}
                  </p>
                </div>
                ` : ''}
              </div>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${taskUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0F3F7F; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(15, 63, 127, 0.35); text-align: center;">
                      View Task in Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${taskUrl}" target="_blank" rel="noopener noreferrer" style="color: #0F3F7F; word-break: break-all; text-decoration: underline;">
                  ${taskUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #D8E0EA; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #475467;">
                Mustaqbil Bridge Volunteer Management Portal
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                You received this email because you are registered as a volunteer. Log in to update task progress, post comments, or submit for review.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const textContent = `
Hello ${displayName},

You have been assigned a new task on the Mustaqbil Bridge portal.

Task: ${taskTitle}
Domain: ${taskDomain || 'General'}
Priority: ${taskPriority}
Due Date: ${taskDueDate || 'Not specified'}

${taskDescription ? `Description:\n${taskDescription}\n\n` : ''}
View and work on this task here:
${taskUrl}

Mustaqbil Bridge Team
`.trim()

  try {
    const transporter = getSmtpTransporter()
    const info = await transporter.sendMail({
      from: fromAddress,
      to: assigneeEmail,
      subject,
      text: textContent,
      html: htmlContent,
    })

    console.log(`[Email] Task assignment email sent to ${assigneeEmail}: MessageId ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`[Email] Failed to send task assignment email to ${assigneeEmail}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

export interface TaskReminderEmailParams {
  taskId: string
  taskTitle: string
  taskDescription?: string | null
  taskDomain?: string | null
  taskPriority?: string | null
  taskDueDate: string
  assigneeName?: string | null
  assigneeEmail: string
}

export async function sendDueTomorrowEmail(params: TaskReminderEmailParams) {
  const {
    taskId,
    taskTitle,
    taskDescription,
    taskDomain,
    taskPriority = 'medium',
    taskDueDate,
    assigneeName,
    assigneeEmail,
  } = params

  if (!assigneeEmail) {
    console.warn('[Email] Skipping due reminder: No assignee email provided.')
    return { success: false, error: 'No assignee email' }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const taskUrl = `${siteUrl}/tasks/${taskId}`
  const fromAddress = process.env.EMAIL_FROM || `Mustaqbil Bridge <${process.env.SMTP_USER || 'mustaqbilbridge@gmail.com'}>`

  const normalizedPriority = (taskPriority || 'medium').toLowerCase()
  const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
    urgent: { bg: '#FEE4E2', text: '#B42318', label: 'Urgent Priority' },
    high: { bg: '#FEF0C7', text: '#B54708', label: 'High Priority' },
    medium: { bg: '#E0F2FE', text: '#026AA2', label: 'Medium Priority' },
    low: { bg: '#F2F4F7', text: '#344054', label: 'Low Priority' },
  }
  const priorityInfo = priorityColors[normalizedPriority] || priorityColors.medium

  const displayName = assigneeName || assigneeEmail.split('@')[0]
  const subject = `[Reminder] "${taskTitle}" is due tomorrow`

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #101828; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F7FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #D8E0EA; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 63, 127, 0.08);">
          
          <!-- Top Navy Header Banner -->
          <tr>
            <td style="background-color: #0F3F7F; padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #FFFFFF;">
                      MUSTAQBIL <span style="color: #FFC107;">BRIDGE</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                      Volunteer Operations Portal
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 193, 7, 0.2); border: 1px solid #FFC107; color: #FFC107; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                      Due Tomorrow
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #101828; line-height: 1.3;">
                Hello ${displayName},
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #475467; line-height: 1.6;">
                This is a friendly reminder that you have a task scheduled for completion <strong>tomorrow (${taskDueDate})</strong> on the Mustaqbil Bridge portal.
              </p>

              <!-- Task Card Box -->
              <div style="background-color: #FFFDF5; border: 1px solid #FDE68A; border-radius: 14px; padding: 24px; margin-bottom: 28px;">
                <!-- Tags Row -->
                <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                  <tr>
                    ${taskDomain ? `
                    <td style="padding-right: 8px;">
                      <span style="display: inline-block; background-color: #EAF1FF; color: #0F3F7F; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 9px; border-radius: 6px;">
                        ${taskDomain}
                      </span>
                    </td>
                    ` : ''}
                    <td style="padding-right: 8px;">
                      <span style="display: inline-block; background-color: ${priorityInfo.bg}; color: ${priorityInfo.text}; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">
                        ${priorityInfo.label}
                      </span>
                    </td>
                    <td>
                      <span style="display: inline-block; background-color: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">
                        Due: ${taskDueDate}
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Task Title -->
                <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #101828; line-height: 1.4;">
                  ${taskTitle}
                </h2>

                <!-- Description Preview -->
                ${taskDescription ? `
                <div style="border-top: 1px solid #FDE68A; padding-top: 14px; margin-top: 12px;">
                  <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #92400E;">
                    Task Overview
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line;">
                    ${taskDescription}
                  </p>
                </div>
                ` : ''}
              </div>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${taskUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0F3F7F; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(15, 63, 127, 0.35); text-align: center;">
                      View Task & Update Progress &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${taskUrl}" target="_blank" rel="noopener noreferrer" style="color: #0F3F7F; word-break: break-all; text-decoration: underline;">
                  ${taskUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #D8E0EA; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #475467;">
                Mustaqbil Bridge Volunteer Management Portal
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Automated daily reminder from your team portal. Please log in to complete your work or submit for review.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const textContent = `
Hello ${displayName},

This is a friendly reminder that your assigned task is due tomorrow (${taskDueDate}):

Task: ${taskTitle}
Domain: ${taskDomain || 'General'}
Priority: ${taskPriority}
Due Date: ${taskDueDate}

${taskDescription ? `Description:\n${taskDescription}\n\n` : ''}
Please view and update your progress here:
${taskUrl}

Mustaqbil Bridge Team
`.trim()

  try {
    const transporter = getSmtpTransporter()
    const info = await transporter.sendMail({
      from: fromAddress,
      to: assigneeEmail,
      subject,
      text: textContent,
      html: htmlContent,
    })

    console.log(`[Email] Due-tomorrow reminder email sent to ${assigneeEmail}: MessageId ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`[Email] Failed to send due-tomorrow reminder to ${assigneeEmail}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

export interface QuestionAskedEmailParams {
  taskId: string
  taskTitle: string
  question: string
  volunteerName: string
  volunteerEmail?: string | null
  adminManagerEmails: string[]
}

export async function sendQuestionAskedEmail(params: QuestionAskedEmailParams) {
  const {
    taskId,
    taskTitle,
    question,
    volunteerName,
    adminManagerEmails,
  } = params

  const validRecipients = adminManagerEmails.filter(Boolean)
  if (validRecipients.length === 0) {
    console.warn('[Email] Skipping question email: No admin or manager recipients.')
    return { success: false, error: 'No recipients' }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const taskUrl = `${siteUrl}/tasks/${taskId}`
  const fromAddress = process.env.EMAIL_FROM || `Mustaqbil Bridge <${process.env.SMTP_USER || 'mustaqbilbridge@gmail.com'}>`
  const subject = `[Mustaqbil Bridge] New Question on "${taskTitle}" from ${volunteerName}`

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #101828; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F7FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #D8E0EA; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 63, 127, 0.08);">
          <tr>
            <td style="background-color: #0F3F7F; padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #FFFFFF;">
                      MUSTAQBIL <span style="color: #FFC107;">BRIDGE</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                      Volunteer Operations Portal
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 193, 7, 0.2); border: 1px solid #FFC107; color: #FFC107; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                      New Question
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #101828; line-height: 1.3;">
                Question Raised on Task
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475467;">
                Volunteer <strong>${volunteerName}</strong> has asked a question regarding <strong>"${taskTitle}"</strong> and is awaiting guidance:
              </p>

              <!-- Question Box -->
              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #D97706; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #B45309; margin-bottom: 8px;">
                  Volunteer Question
                </div>
                <div style="font-size: 14px; line-height: 1.6; color: #92400E; font-style: italic;">
                  "${question}"
                </div>
              </div>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #0F3F7F;">
                    <a href="${taskUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px; letter-spacing: 0.2px;">
                      View Task & Reply &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5;">
                Or open directly in portal: <a href="${taskUrl}" target="_blank" rel="noopener noreferrer" style="color: #0F3F7F; text-decoration: underline;">${taskUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #D8E0EA; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #475467;">
                Mustaqbil Bridge Volunteer Management Portal
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                You received this notification because you are registered as an admin or manager on the portal.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const textContent = `
Hello Team,

Volunteer ${volunteerName} has asked a question on "${taskTitle}":

"${question}"

Please view the task and provide an answer:
${taskUrl}

Mustaqbil Bridge Volunteer Operations
`.trim()

  try {
    const transporter = getSmtpTransporter()
    const info = await transporter.sendMail({
      from: fromAddress,
      to: validRecipients.join(', '),
      subject,
      text: textContent,
      html: htmlContent,
    })

    console.log(`[Email] Question notification sent to ${validRecipients.length} admins/managers: MessageId ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[Email] Failed to send question notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

export interface QuestionAnsweredEmailParams {
  taskId: string
  taskTitle: string
  question: string
  answer: string
  volunteerName: string
  volunteerEmail: string
  answeredByName?: string | null
}

export async function sendQuestionAnsweredEmail(params: QuestionAnsweredEmailParams) {
  const {
    taskId,
    taskTitle,
    question,
    answer,
    volunteerName,
    volunteerEmail,
    answeredByName = 'Management Team',
  } = params

  if (!volunteerEmail) {
    console.warn('[Email] Skipping answer notification: No volunteer email provided.')
    return { success: false, error: 'No volunteer email' }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const taskUrl = `${siteUrl}/tasks/${taskId}`
  const fromAddress = process.env.EMAIL_FROM || `Mustaqbil Bridge <${process.env.SMTP_USER || 'mustaqbilbridge@gmail.com'}>`
  const subject = `[Mustaqbil Bridge] Your Question on "${taskTitle}" Has Been Answered`

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #101828; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F7FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #D8E0EA; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 63, 127, 0.08);">
          <tr>
            <td style="background-color: #0F3F7F; padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #FFFFFF;">
                      MUSTAQBIL <span style="color: #FFC107;">BRIDGE</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.7); margin-top: 4px;">
                      Volunteer Operations Portal
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(22, 163, 74, 0.2); border: 1px solid #16A34A; color: #4ADE80; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
                      Answered
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #101828; line-height: 1.3;">
                Answer to Your Question
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475467;">
                Hello <strong>${volunteerName}</strong>, <strong>${answeredByName}</strong> has answered your question on task <strong>"${taskTitle}"</strong>:
              </p>

              <!-- Original Question Box -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 18px; margin-bottom: 16px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 6px;">
                  Your Question
                </div>
                <div style="font-size: 13px; line-height: 1.5; color: #475467; font-style: italic;">
                  "${question}"
                </div>
              </div>

              <!-- Answer Box -->
              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #15803D; margin-bottom: 8px;">
                  Answer from ${answeredByName}
                </div>
                <div style="font-size: 14px; line-height: 1.6; color: #166534; font-weight: 500;">
                  ${answer}
                </div>
              </div>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #0F3F7F;">
                    <a href="${taskUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px; letter-spacing: 0.2px;">
                      Open Task in Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center; line-height: 1.5;">
                Or open directly in portal: <a href="${taskUrl}" target="_blank" rel="noopener noreferrer" style="color: #0F3F7F; text-decoration: underline;">${taskUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #D8E0EA; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #475467;">
                Mustaqbil Bridge Volunteer Management Portal
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Automated update regarding your submitted question.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const textContent = `
Hello ${volunteerName},

${answeredByName} has answered your question on task "${taskTitle}":

Question:
"${question}"

Answer:
${answer}

View the task in your portal:
${taskUrl}

Mustaqbil Bridge Volunteer Operations
`.trim()

  try {
    const transporter = getSmtpTransporter()
    const info = await transporter.sendMail({
      from: fromAddress,
      to: volunteerEmail,
      subject,
      text: textContent,
      html: htmlContent,
    })

    console.log(`[Email] Answer notification sent to ${volunteerEmail}: MessageId ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`[Email] Failed to send answer notification to ${volunteerEmail}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

