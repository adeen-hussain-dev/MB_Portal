import { createAdminClient } from '@/lib/supabase/admin'

export type NotificationType =
  | 'task_assigned'
  | 'task_status'
  | 'question_asked'
  | 'question_answered'
  | 'system'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body: string
  taskId?: string | null
}

export interface NotificationRecord {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  taskId?: string | null
  isRead: boolean
  createdAt: string
}

/**
 * Creates a single in-app notification using the service-role client.
 * Bypasses RLS by design per security rules (client-side inserts are rejected).
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, body, taskId } = params
  if (!userId || !title || !body) return null

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title: title.trim(),
        body: body.trim(),
        task_id: taskId || null,
        is_read: false,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[Notifications] Failed to insert notification:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('[Notifications] Unexpected error creating notification:', err)
    return null
  }
}

/**
 * Creates multiple in-app notifications in batch using the service-role client.
 */
export async function createNotifications(items: CreateNotificationParams[]) {
  if (!items || items.length === 0) return []

  try {
    const admin = createAdminClient()
    const payload = items
      .filter((item) => item.userId && item.title && item.body)
      .map((item) => ({
        user_id: item.userId,
        type: item.type,
        title: item.title.trim(),
        body: item.body.trim(),
        task_id: item.taskId || null,
        is_read: false,
      }))

    if (payload.length === 0) return []

    const { data, error } = await admin
      .from('notifications')
      .insert(payload)
      .select('*')

    if (error) {
      console.error('[Notifications] Failed to batch insert notifications:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('[Notifications] Unexpected error batch creating notifications:', err)
    return []
  }
}
