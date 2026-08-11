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

### ✅ Built
1. **Project setup** — Next.js + Supabase + shadcn scaffolding
2. **Database schema v1** — core tables + RLS
3. **Auth** — invite-only signup, Gmail SMTP, login page, `/auth/callback` (set password), middleware route protection
4. **Team directory (read)** — lists profiles with Active/Invited status; "Add Volunteer" visible to admin only

### ⬜ To build, in this order (see §8 for why this order)
5. **Task creation + assignment** — form with title, description, assignee, priority, due date, domain; attachment upload
6. **Task list + detail view** — table view, single-task page with comments
7. **Kanban board** — drag-drop across the 5 statuses, respecting the transition rules in §3
8. **Approval flow** — the "review" action for managers/admin: **Approve** (→ done) needs no input; **Request changes** (→ changes requested) requires the manager to type a reason in a text box before submitting — that text is saved as a comment on the task so the volunteer sees exactly what to fix
9. **Questions** — volunteer asks on a task, routed to manager/admin, answer flow
10. **Notifications (in-app)** — bell icon, unread count, list, mark-as-read
11. **Email notifications** — task assigned, due-tomorrow reminder (daily cron), question raised, question answered — each its own template, sent via Nodemailer/Gmail
12. **Profile module** — change password, change photo; volunteer view is read-only for name/email/phone/domain
13. **Admin/Manager dashboard** — volunteer performance bar chart + "this month's best volunteer" (computed live from `tasks` where `status = 'done' and approved_at` is in the current month — no separate stats table needed at this scale)
14. **Landing page** — built last, once the product itself is real and there's something true to show/animate

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
- Logo is ready — share the file when we reach the landing page module (§6, built last); until then the wordmark placeholder in §4 stands.

## 9a. Remaining assumptions (flag if wrong)

- Task attachments capped at ~20MB/file (soft limit, enforced client-side) to protect the 1GB free storage quota.

## 10. Open questions (need your answer before/while building the relevant module)

- **Reassignment** — can admin/manager reassign a task to a different volunteer after it's created?
- **Inactive volunteers** — when a volunteer's status is set to inactive, what happens to their open tasks — manual reassignment, or automatic?
- **Time zone** — due dates and the "due tomorrow" reminder — should these run on Pakistan time (PKT) rather than UTC? (Vercel Cron only runs in UTC, so we'll need to offset the query.)
- **Search/filter** on the task list and directory — not mentioned yet; worth having once task count grows past a page or two.

---

## 11. What changes if a future instruction changes DB or file structure

Going forward, any new requirement that touches the database or the file layout will be called out **separately, right under the requirement**, the same way §5 does above — not buried in general text — so you always know exactly what to run in Supabase or where to create a file before moving on.
