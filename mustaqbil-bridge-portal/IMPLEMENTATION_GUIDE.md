# Mustaqbil Bridge — Task Portal
## Implementation Guide (hand-off document)

This document is written so any AI coding assistant (Copilot, Claude, Cursor, etc.) can resume this project without re-reading the whole chat history. It covers what's already built, what's left, how it should look, and how each module should behave and be secured. Build and test **one module at a time**, in the order given in Section 8 — don't jump ahead.

---

## 1. Project Overview

- **What it is:** An internal task/volunteer management tool for Mustaqbil Bridge, a youth career-development organization.
- **Who uses it:** 3 roles — **Admin** (full control), **Manager** (assigns/monitors/approves tasks), **Volunteer** (works their own tasks). Currently ~9 people: 1 admin, mom/sister as manager(s), 6 volunteers.
- **Core job:** Linear-style task management + a volunteer directory, replacing ad-hoc coordination now that the team has grown from 3 to 9.
- **Hard constraint:** $0 cost, deployed on Vercel's free Hobby tier.

---

## 2. Tech Stack

| Layer | Choice | Status |
|---|---|---|
| Frontend + backend | Next.js 15 (App Router, TypeScript) | ✅ set up |
| UI components | Tailwind CSS + shadcn/ui | ✅ set up |
| Database + Auth + Storage | Supabase (Postgres) | ✅ project created |
| Drag-and-drop (Kanban) | `@dnd-kit` | ✅ installed, not yet used |
| Charts (analytics) | `recharts` | ⬜ not yet installed |
| Auth emails (invite, reset) | Gmail SMTP via Supabase custom SMTP | ✅ working |
| Custom app emails (assigned, reminders, questions) | **Nodemailer + the same Gmail App Password**, sent from our own API routes/cron — no new service needed. Can swap to Resend later with zero code changes beyond the transporter config, once a domain exists | ⬜ not yet built |
| Scheduled daily reminder job | Vercel Cron (Hobby plan allows up to 100 cron jobs/project, capped at once-per-day frequency — which is exactly what we need) | ⬜ not yet built |
| Animation | Framer Motion | ⬜ not yet added |
| Deployment | Vercel (Hobby, free) | ⬜ not yet deployed |

---

## 3. Roles & Permissions (final)

| Capability | Admin | Manager | Volunteer |
|---|---|---|---|
| View all tasks | ✅ | ✅ | ❌ (own only) |
| Create / assign tasks | ✅ | ✅ | ❌ |
| Move task: todo → in progress → in review | ✅ | ✅ | ✅ (own tasks) |
| Approve task: in review → **done** | ✅ | ✅ | ❌ |
| Reject task: in review → **changes requested** | ✅ | ✅ | ❌ |
| Delete task | ✅ | ❌ | ❌ |
| See full status-change history (activity log) | ✅ | ❌ | ❌ |
| See current task status | ✅ | ✅ | ✅ (own) |
| Add/edit volunteers, change roles | ✅ | ❌ (view only — see §11) | ❌ |
| View volunteer directory | ✅ | ✅ | ✅ |
| Comment on a task | ✅ | ✅ | ✅ (own tasks) |
| Ask a question on a task | — | — | ✅ (own tasks) |
| Answer a question | ✅ | ✅ | — |
| Edit own profile fields (name/phone/domain) | ✅ (own + others) | ❌ (own only, same as volunteer) | ❌ |
| Change own photo / password | ✅ | ✅ | ✅ |

---

## 4. Design System

*Grounded in what this actually is: an internal tool for a youth career-development org called "Mustaqbil" (Urdu/Arabic for "future") — the landing page's only job is to look credible and get a known user to sign in confidently, not to sell anything to strangers.*

### Colors
Your three brand colors are fixed inputs; extended with the functional shades a real dashboard needs:

| Name | Hex | Use |
|---|---|---|
| Bridge Navy | `#0F3F7F` | Primary — sidebar, headers, primary text-on-light |
| Signal Amber | `#FFC107` | Accent — CTAs, active nav item, highlight badges. **Use sparingly, not as a background fill everywhere.** |
| Paper White | `#FFFFFF` | Base background |
| Ink | `#101828` | Body text |
| Slate | `#64748B` | Secondary text, borders, placeholders |
| Mist | `#F5F7FA` | Card fills, subtle section backgrounds |
| Approved Green | `#16A34A` | "Done" status, approvals |
| Alert Red | `#DC2626` | Overdue, "changes requested" |

### Typography
- **Display/headings — Space Grotesk.** Geometric, has character, avoids the generic "Inter-everywhere" SaaS look while staying modern and legible.
- **Body/UI — Inter.** Optimized for small UI text — this is a data-dense dashboard, legibility at 13–14px matters more than personality here.
- **Data/utility — IBM Plex Mono.** Use for due dates, timestamps, and task IDs — tabular figures line up cleanly in lists and tables.

### Landing page (signature concept)
Not a marketing site — a confident front door. Structure:
- Logo mark + "Mustaqbil Bridge" wordmark, top-left (logo file needed from you — until supplied, use the wordmark in Space Grotesk as placeholder)
- **Signature element:** a thin horizontal line made of connected nodes that animates filling left-to-right on page load — representing `todo → in progress → in review → done`. This ties the org's own name (a "bridge" to the future) to the product's actual mechanic (moving a task from start to finish) in one visual, instead of a generic hero graphic. Build with Framer Motion.
- One headline built on that same idea, one short subhead, one primary CTA ("Sign in") in Signal Amber on Bridge Navy.
- Keep everything below the fold minimal — 3–4 short lines max, no invented marketing sections. This isn't a public acquisition page.

### Login page
Centered card on a Mist background. Logo above the form. Amber submit button. No marketing copy — one job only.

### Portal shell (applies to every dashboard page — don't redesign per page)
- Left sidebar: Bridge Navy background, white text/icons, Amber used **only** for the active nav indicator.
- Content area: Paper White background, Mist for card fills, subtle shadow, consistent `rounded-xl` corners.
- Status colors (green/amber/red/slate) are reserved for task-status badges and the analytics chart only — don't reuse them decoratively elsewhere, or they stop meaning anything at a glance.
- Motion stays restrained in the portal: a light fade/slide on page load, subtle hover states. Save the real animation moment for the landing page — scattering micro-animations everywhere reads as templated, not polished.

---

## 5. Database — what's built vs. what's new

### Already built and deployed
`profiles`, `tasks`, `task_comments`, `task_attachments`, `activity_log` — with RLS policies as described in earlier chat. Enums: `user_role`, `task_status` (todo/in_progress/in_review/done), `task_priority`.

### New, required by today's requirements (build when we reach the relevant module — see §8; exact SQL will be given at that point, not dumped all at once)

| Change | Reason |
|---|---|
| `task_status` enum: add `changes_requested` | Manager can reject a review instead of only approving it |
| `tasks.approved_by`, `tasks.approved_at` | Track who approved the "done" transition and when |
| New table `notifications` (id, user_id, type, title, body, task_id, is_read, created_at) | Powers the in-app bell icon |
| New table `task_questions` (id, task_id, asked_by, question, answered_by, answer, status, created_at, answered_at) | Volunteer Q&A thread, separate from general comments so it can be tracked to resolution and routed distinctly |
| `activity_log` RLS: restrict SELECT to admin only | Status-change history should not be visible to manager or volunteer, per your requirement — they still see the task's *current* status, just not the history |
| New trigger `enforce_task_status_transitions()` | Blocks a volunteer from setting status to `done` or `changes_requested` directly at the database level (not just hidden in the UI) |
| New trigger `enforce_profile_self_edit()` | Blocks a volunteer or manager from changing anything but `avatar_url` on their own profile row, enforced at the database level |
| No new column — reuse `task_comments` | When a manager rejects a review (`in_review` → `changes_requested`), the required "what to change" text is inserted as a `task_comment` on that task in the same action, not a separate field. This keeps it visible to the volunteer under the existing comment-visibility rules, while the full status-change event still only shows up in the admin-only `activity_log` |
| Storage bucket `avatars` (public read) | Profile photos |
| Storage bucket `task-attachments` (private, RLS-gated) | Task file attachments, any file type — recommend a soft 20MB per-file cap so a handful of large files don't eat the 1GB free storage quota; confirm this limit works for you |

---

## 6. Modules

### ✅ Built and verified (real tests, not just code review)
1. **Project setup**
2. **Database schema v1**
3. **Auth** — invite-only signup, Gmail SMTP, login, `/auth/callback`, `proxy.ts` route protection
4. **Team directory** — RLS-verified with real throwaway accounts
5. **Task creation + assignment** — including real file attachments (RLS-verified)
6. **Comment composer** — verified with real comments posted by manager and volunteer
7. **Kanban board** — drag-and-drop, drag-to-approve removed, Review modal, responsive layout
8. **Approval flow** — `changes_requested`, `approved_by`/`approved_at`, rejection reason saved as a comment
9. **Questions** (`task_questions`) — volunteer asks on a task, routed to manager/admin, answer flow with live `answeredByName` and RLS enforcement
10. **Notifications (in-app)** — bell icon, unread count badge, interactive dropdown list, mark-as-read, realtime sync (RLS-enforced, server-only inserts). Verified: both Admin & Manager notified on `in_review` submissions. Note: requires `alter publication supabase_realtime add table notifications;` run in Supabase SQL Editor to enable instant WebSocket push; otherwise safely falls back to 30s polling.
11a/b. **Email — task assigned & due-tomorrow reminder** — confirmed via real inbox + real cron auth checks, with same-day dedup via `activity_log`
11c/d. **Email — question raised & question answered** — branded Nodemailer emails dispatched on question ask and answer, verified via real Gmail IMAP
12. **Profile page** — avatar upload and password change verified with real accounts
12A/B/C. **Section 12 Requirements** — late-submission reason, hybrid attachments (files & external links), satisfaction rating (1-10) with updated leaderboard formula
13. **Admin/Manager dashboard & Monthly Winners Snapshot** — role-split overview, `recharts` completed tasks chart, formula-scored leaderboard (`(completed*10) + (on_time*5) - (rejections*5) + (avg_rating*3)`), `monthly_winners` table populated automatically on the 1st of each month via PKT cron, duplicate-safe unique(month) constraint, and "Past Winners" dashboard list.

### ⬜ Next up / Remaining (Final Module)
14. **Polish & Deploy** — landing page signature animated bridge line, Vercel Hobby deployment check

### ✅ Exists (built ahead of planned order)
14. **Landing page** — live, branded; the signature animated "bridge line" is still pending as polish, not urgent

Each module = its own PR/commit, testable in isolation before moving to the next.

---

## 7. Email templates (each dedicated, on-theme)

All sent from our own code (Nodemailer + Gmail App Password for now), separate from Supabase's own auth emails (invite/reset, which stay on Supabase's SMTP settings):

1. **Task assigned** — to volunteer, when admin/manager assigns a task
2. **Due tomorrow reminder** — to volunteer, sent by the daily cron for tasks still `todo`/`in_progress` with `due_date` = tomorrow
3. **Question raised** — to admin + manager, when a volunteer asks a question
4. **Question answered** — to volunteer, when their question gets answered

Each template shares one HTML shell (Bridge Navy header with logo, Paper White body, Signal Amber button) but has its own subject line and message — not one generic template reused for everything.

---

## 8. Why this build order

Task creation has to exist before Kanban has anything to show. Kanban has to exist before "approval flow" has a review step to act on. Notifications and emails need tasks/questions to already exist as trigger events, so they come after. Dashboard needs real task data (done + approved tasks) to chart, so it comes near the end. Landing page comes last because it should reflect a real, working product rather than being designed against an empty guess.

---

## 9. Confirmed decisions (were open questions, now settled)

- Manager can view but **not edit** anyone's profile fields, including their own name/phone/domain — same restriction as a volunteer. Only admin edits profile data.
- Volunteers have **no edit access to their own profile fields either**, except their photo — name/email/phone/domain are read-only for them too, editable by admin only.
- `changes_requested` status confirmed — and rejecting a review requires the manager to type a reason (see §5 and Module 8 above).
- Custom emails (assigned, reminders, questions) go out via **Nodemailer + the existing Gmail App Password** — no Resend/new domain needed for now.
- Logo is ready — drop the file into the project (e.g. `public/logo.svg`) whenever convenient; Module 14 will use it directly, no wordmark placeholder needed.
- **Reassignment**: both admin and manager can reassign a task to a different volunteer after creation — same authority they already have to assign it in the first place.
- **Inactive volunteers**: reassignment of their open tasks stays **manual** — when a volunteer is set to inactive, show admin/manager a warning with their open-task count so nothing gets silently dropped. No auto-reassignment.
- **Time zone**: due dates and the "due tomorrow" reminder run on **Pakistan time (PKT, UTC+5)**, not UTC. Since Vercel Cron only fires in UTC, offset the schedule accordingly (e.g. a 9:00 AM PKT reminder = `0 4 * * *` in `vercel.json`), and do the "is due_date tomorrow" comparison in PKT inside the route, not against the server's UTC "today."
- **Search/filter**: fold basic status/assignee filters into Module 6 (task list) now, since it's cheap to add alongside the list view itself. Full-text search stays deferred until it's actually needed.
- **Activity log granularity**: log **every** status change, not just final review transitions — a complete audit trail, since the trigger already fires on any status update anyway.

## 9a. Remaining assumptions (flag if wrong)

- Task attachments capped at ~20MB/file (soft limit, enforced client-side) to protect the 1GB free storage quota.

## 10. Housekeeping before Module 5

- Clean up the stray pasted-text block currently inside `src/app/auth/callback/page.tsx` before building further on top of it.

---

## 12. New requirements (added after Module 8) — schema changes called out separately

### A. Late-submission reason (no new column)
When a volunteer moves a task to `in_review` and `due_date` (in PKT) has already passed, require a typed reason before the submission commits. Insert it as a `task_comment` tagged `[Late Submission]: ...`, same pattern as the rejection reason. **Enforce in both places that can trigger this transition — Kanban drag AND the task-detail dropdown — and enforce server-side in the PATCH route, not just in a UI modal**, to avoid the same multi-entry-point bug we already fixed once for done/changes_requested.

### B. Task submission attachments — hybrid storage approach
- Images, Excel, Word/PDF: direct upload to the existing `task-attachments` bucket (20MB/file cap already in place).
- Video/reels: **no file upload** — add a plain URL field instead (Google Drive share link or unlisted YouTube link). Reason: Supabase's free storage is capped at 1GB total; video files would exhaust it quickly, while Google Drive alone gives 15GB free per account.
- **Schema change**: extend `task_attachments` rather than adding a new table:
  ```sql
  alter table task_attachments
    add column if not exists attachment_type text not null default 'file'
    check (attachment_type in ('file', 'link'));
  ```
  For `'file'` rows, `file_url` is the Storage path as today. For `'link'` rows, `file_url` holds the pasted Google Drive/YouTube URL and `file_name` holds whatever label the user gives it (e.g. "Career Fair Reel").

### C. Task satisfaction rating (new column + leaderboard change) — CONFIRMED
- New column: `tasks.satisfaction_rating integer` (1–10), nullable, set only at approval time.
- **Confirmed**: both admin and manager can set this (not admin-only as first assumed), and it's **mandatory** — the approve action is rejected server-side if it's missing or out of range.
- Leaderboard formula (§13/Module 13), confirmed as proposed:
  `score = (completed × 10) + (on_time × 5) - (rejections × 5) + (avg_rating × 3)`

---

## 13. What changes if a future instruction changes DB or file structure

Going forward, any new requirement that touches the database or the file layout will be called out **separately, right under the requirement**, the same way §5 and §12 do above — not buried in general text — so you always know exactly what to run in Supabase or where to create a file before moving on.