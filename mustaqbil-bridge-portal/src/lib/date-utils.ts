/**
 * Utility functions for Pakistan Standard Time (PKT / Asia/Karachi, UTC+5).
 * All portal due dates and deadline comparisons run strictly on PKT.
 */

export function getPktTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Checks whether a given due date string (YYYY-MM-DD) has already passed in PKT.
 * If due date is today in PKT, it is NOT past due (the user still has today).
 */
export function isTaskPastDuePkt(dueDate?: string | null): boolean {
  if (!dueDate) return false
  const todayPkt = getPktTodayString()
  return todayPkt > dueDate
}
