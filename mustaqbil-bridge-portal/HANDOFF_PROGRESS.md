# Mustaqbil Bridge — Current Progress & Handoff Report

## 1. Executive Summary

This project is a Next.js 16.3.0 App Router application for an internal task and volunteer operations portal for Mustaqbil Bridge. The app uses TypeScript, Tailwind CSS v4, shadcn-style UI primitives, and Supabase for authentication, database access, and invite flow management.

Current state:
- Frontend stack: Next.js 16.3.0, React 19, App Router, TypeScript
- Styling: Tailwind CSS v4, custom brand tokens, shadcn-styXle component primitives
- Auth + database: Supabase SSR + Supabase JS + service-role admin client
- Build validation: `npm run build` succeeds in the current workspace
- Important warnings remain: the `middleware` convention is deprecated in Next.js 16 and should eventually move to `proxy`; Supabase warns that Node 20 is below the recommended version for future compatibility

Overall project status:
- The foundation is working and verified.
- The app has a real branded landing page, login page, authenticated portal shell, dashboard, team directory, and data-backed task workspace.
- The project is not yet complete according to the implementation guide; the remaining modules are still ahead.

---

## 2. Implemented & Verified Architecture

### Core Scaffold & Routes
The app has the expected Next.js App Router structure and key route files:

- `src/app/layout.tsx` — root layout with Google font variables and global CSS import
- `src/app/page.tsx` — branded public landing page
- `src/app/loading.tsx` — global loading screen
- `src/app/error.tsx` — global error boundary
- `src/app/(auth)/login/page.tsx` — invite-only login screen
- `src/app/auth/callback/page.tsx` — invited-user password setup flow
- `src/app/(dashboard)/layout.tsx` — authenticated portal shell
- `src/app/(dashboard)/page.tsx` — database-backed overview dashboard
- `src/app/(dashboard)/tasks/page.tsx` — task workspace entry route
- `src/app/(dashboard)/tasks/[id]/page.tsx` — task detail page
- `src/app/(dashboard)/team/page.tsx` — volunteer directory page
- `src/app/api/users/route.ts` — invite creation endpoint
- `src/app/api/tasks/route.ts` — task collection route
- `src/app/api/tasks/[id]/route.ts` — single-task route
- `src/app/api/comments/route.ts` — task comment route
- `src/middleware.ts` — auth guard and route protection logic

### Database & Auth Integration
Real Supabase integration is present and wired into the portal data layer:

- `src/lib/supabase/client.ts` — browser client for client-side auth and read flow
- `src/lib/supabase/server.ts` — server-side client for server components / app routes
- `src/lib/supabase/admin.ts` — service-role client for privileged operations
- `src/lib/portal-data.ts` — central data layer for fetching and mutating tasks, profiles, and dashboard summaries
- `src/lib/task-store.ts` — shared task type mapping and row normalization helpers
- `src/types/database.types.ts` — generated/partial Supabase scaffold
- `.env.local` — contains runtime values such as:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

### UI & Dashboard Components
The UI structure is organized into reusable component modules:

- `src/components/layout/sidebar.tsx` — fixed/desktop sidebar and mobile drawer shell
- `src/components/tasks/kanban-board.tsx` — existing board component scaffold for future kanban module
- `src/components/tasks/task-card.tsx` — task summary card with status/priority badges
- `src/components/tasks/task-workspace.tsx` — task list/search/filter workflow
- `src/components/tasks/task-create-dialog.tsx` — creation form for tasks
- `src/components/team/add-volunteer-dialog.tsx` — invite volunteer dialog
- `src/components/ui/button.tsx` — shared button primitive
- `src/components/ui/input.tsx` — input primitive
- `src/components/ui/select.tsx` — select primitive
- `src/components/ui/dialog.tsx` — dialog primitive
- `src/components/ui/card.tsx` — card primitive
- `src/components/ui/badge.tsx` — badge primitive
- `src/components/ui/dropdown-menu.tsx` — dropdown UI primitive
- `src/components/ui/avatar.tsx` — avatar primitive
- `src/components/ui/table.tsx` — table primitive

### Supporting Project Files
- `components.json` — shadcn-style config
- `next.config.ts` — Next.js config
- `tsconfig.json` — TS setup
- `eslint.config.mjs` — lint config
- `public/MB_Logo.svg` — current logo asset used in app and auth screens
- `README.md` — project documentation
- `IMPLEMENTATION_GUIDE.md` — module-level roadmap and constraints

---

## 3. Verified Features & Workflows

### Authentication & Invite Flow
Verified real behavior is in place:

- Invite-only logins are supported through Supabase auth.
- `/login` accepts email + password and uses `supabase.auth.signInWithPassword(...)`.
- Middleware blocks unauthenticated users from protected dashboard routes and sends them to `/login`.
- Logged-in users attempting to visit `/login` are redirected to `/tasks`.
- Admin invite flow is implemented in `src/app/api/users/route.ts` using `admin.auth.admin.inviteUserByEmail(...)` with redirect to `/auth/callback`.
- The callback page reads the access and refresh tokens from the URL hash and calls `setSession(...)`.
- After the session is valid, the user is asked to set a password using `updateUser({ password })` and then sent into the portal.

### Data Layer & Portal Behavior
The app is now backed by actual Supabase data instead of mock arrays:

- `fetchTasks()`, `fetchTaskById()`, `fetchProfiles()`, `fetchDashboardSummary()` all run against Supabase tables.
- `createTask()`, `updateTask()`, and `deleteTask()` rely on the service-role admin client for privileged writes.
- `portal-data.ts` maps database rows into consistent task objects, including comments and task metadata.
- Dashboard counts are computed from actual task data (`openTasks`, `inReview`, `done`, volunteer count, comment count).
- Task list and detail routes use real database data and handle empty states gracefully.

### Team & Task Management Features
The current app includes working task and team UX scaffolding:

- Team page lists profiles and flags inactive volunteers based on `status` and open-task warnings.
- Task workspace includes search, status filtering, assignee filtering, and task summary metrics.
- Task creation dialog allows assigning a task to a volunteer, selecting priority, domain, due date, and optional attachment name.
- Task cards render task title, assignee, domain, due date, status, and priority.
- Single-task page renders metadata, comments, and attachments area.

### Design & Branding
The app has been branded to the Mustaqbil Bridge direction:

- Public home page uses the Bridge Navy / Signal Amber palette and a calm internal-tool aesthetic.
- Logo contrast issue on light backgrounds was corrected by applying a visible navy recolor treatment for the SVG on light surfaces.
- The route shell follows consistent card layouts, borders, typography, and dashboard spacing.

### Verified Build State
As of the latest validation run, the app builds successfully:

- `npm run build` completed successfully
- Next.js compiled successfully
- Static/dynamic route generation succeeded for the app routes
- Exit status was successful despite warnings about:
  - deprecated `middleware` naming in Next.js 16
  - Supabase Node 20 deprecation warning

---

## 4. Immediate Next Steps / Pending Modules

These are the exact modules still pending, in order, from the implementation guide and project roadmap.

### Module 5 — Task creation + assignment form
Still required / not complete as a full production-ready module:
- Form must support title, description, assignee, priority, due date, domain, and attachments
- Must validate required fields consistently
- Must store attachments properly in storage and associate them to task entries
- Must ensure correct permissions for admin/manager writes

### Module 6 — Task list + detail view
This is partially in place but should be treated as a work-in-progress:
- Search/filter workspace exists
- Detail page renders metadata and comments
- The UI is not yet the final fully polished table/detail experience required by the guide
- Need final hardened behavior for comment flows and task status transitions

### Module 7 — Kanban board (`@dnd-kit` drag-and-drop integration)
✅ Completed & Verified:
- Built full 5-column interactive board (`todo`, `in_progress`, `in_review`, `changes_requested`, `done`) using `@dnd-kit/core` and `@dnd-kit/sortable`.
- Implemented role-based transition validation (volunteers can only transition their assigned tasks between `todo` <-> `in_progress` -> `in_review`; only admin/manager can approve to `done` or request changes).
- Integrated optimistic UI dragging with live Supabase persistence via `PATCH /api/tasks/[id]` and automatic error rollback.
- Added segmented view switcher (`[ Kanban Board | List View ]`) to `TaskWorkspace`.
- Verified production build via `npm run build` (exit code 0).

### Module 8 — Approval flow (`changes_requested` status, rejection reason requirement)
Not yet built:
- The guide requires a manager/admin approval step: `in_review -> done` or `in_review -> changes_requested`
- The rejection path must require a typed explanation saved as a comment
- The task status must support the `changes_requested` enum value
- Security restrictions must be enforced at the DB level as described in the guide

### Module 9 — Volunteer Q&A thread (`task_questions`)
Not yet built:
- Volunteer asks a question on a task
- Manager/admin can answer it
- The workflow must be separate from general comments and should be tracked distinctly

### Module 10 — In-app notifications
Not yet built:
- Bell icon and unread count
- Notification list and mark-as-read behavior
- Trigger logic tied to task status changes, assignments, comments, and questions

### Module 11 — Email notifications (Nodemailer / Vercel Cron)
Not yet built:
- Task assigned email
- Due tomorrow reminder
- Question raised email
- Question answered email
- Daily cron job scheduled via Vercel Cron
- PKT offset logic against UTC required

### Module 12 — Profile management & edit locks
Not yet built:
- Change password flow
- Profile photo upload
- Locked-down access model for name/email/phone/domain
- Volunteer self-edit restrictions and admin-only edit enforcement

### Module 13 — Admin/Manager analytics dashboard (`recharts`)
Not yet built:
- Volunteer performance chart
- Best volunteer of the month based on completed tasks in current month
- Live computed summary from `tasks` data

### Module 14 — Animated landing page
The app already has a branded landing page, but according to the implementation guide this final polished, motion-led landing page is still expected as a full module:
- stronger animation and progression cues
- finish the design to match the intended brand narrative
- align and polish final copy and motion choices

---

## 5. Known Gotchas & Important Instructions for Cline

This section is critical for handoff continuity.

### Database / Status Rules
- The task status enum must support `changes_requested` and it must be treated as a real status, not a one-off label.
- Manager/admin rejection should save the “what to change” explanation as a `task_comment` on the task, as specified by the guide.
- The app should not silently default missing values with placeholders like “Untitled task” or “Unassigned” in production flow; use real validation and explicit error states.
- `activity_log` should stay admin-only for historical status changes according to the design constraints.

### Security & Access Rules
- Middleware route protection is active and should remain aligned with live auth state.
- Only admin/manager should be allowed to create and update tasks.
- Delete access must remain restricted to admin only.
- Volunteer self-edits are intentionally restricted; the app must not allow direct profile field editing outside the designed admin flow.

### File / Storage Constraints
- Attachment handling is currently incomplete and should not be treated as production storage yet.
- A soft 20MB per-file cap is recommended based on the guide to protect the storage quota.
- The logo uses `public/MB_Logo.svg`, not the older `public/logo.png` convention.

### Environment / Runtime Notes
- `NEXT_PUBLIC_SITE_URL` must stay aligned with the app’s deployed or local environment.
- The Supabase URL must remain the base project URL, not a `/rest/v1/` endpoint.
- Next.js 16 warns that `middleware` should move to `proxy`; this is not a blocker, but it is a future cleanup item.
- Supabase JS warns that Node 20 is deprecated; Node 22 or newer is recommended going forward.

### Time & Cron Behavior
- Due dates and reminder logic should be treated as UTC-first, then offset for PKT when generating reminders.
- Vercel Cron runs in UTC, so the project should explicitly convert business logic to Pakistan time when checking for “due tomorrow” tasks.

### Working Rules for the Next Assistant
- Do not reintroduce mock or hardcoded task arrays into the real app flow.
- Keep the data layer on Supabase-backed reads/writes; prefer real DB access over static demo data.
- Build one module at a time in the implementation-guide order.
- Respect the existing brand system: Bridge Navy, Signal Amber, Mist, and restrained UI styling.
- Verify with `npm run build` after each major change.

---

## 6. Verification Record: Section 12 Requirements (§12A, §12B, §12C)

### A. Late-Submission Reason (§12A) - VERIFIED
- Enforced server-side in `PATCH /api/tasks/[id]` and in both client trigger paths (Kanban drag-and-drop and Task Detail dropdown).
- Strict PKT calendar arithmetic used (`Intl.DateTimeFormat` with `timeZone: 'Asia/Karachi'`).
- Missing or whitespace-only reason rejected with HTTP 400.
- Valid reason accepted with HTTP 200 and automatically written to `task_comments` with `[Late Submission]: <reason>`.

### B. Hybrid Attachments (§12B) - VERIFIED
- Supported both file uploads (Storage paths) and external video/cloud links (Google Drive / YouTube links).
- Populates `attachmentDetails` with `attachmentType: 'file' | 'link'`.
- Verified via `GET /api/tasks/:id` returning structured details with active external link handling.

### C. Satisfaction Rating (§12C) - VERIFIED
- Mandatory 1–10 satisfaction rating required for task approval (`status = 'done'`).
- Missing or out-of-range rating rejected with HTTP 400.
- Rating 1–10 saves successfully with HTTP 200.
- Leaderboard formula updated to: `score = (completed * 10) + (on_time * 5) - (rejections * 5) + (avg_rating * 3)`.

### Clean Database State
- All temporary test tasks and associated rows deleted. Database verified at 0 leftover tasks.

---

## 7. Verification Record: Module 9 (Volunteer Q&A - `task_questions`) — VERIFIED

### Schema & Policies
- `task_questions` table created with columns `id`, `task_id`, `asked_by`, `question`, `answered_by`, `answer`, `status` ('open'|'answered'), `created_at`, `answered_at`.
- RLS enabled with policies using `get_my_role()` to prevent recursive subqueries.

### Components & Routes
- API Routes:
  - `POST /api/questions`: enforces assignee authentication (`task.assignee_id === user.id`), inserts into `task_questions`, triggers `sendQuestionAskedEmail()`.
  - `PATCH /api/questions/[id]/answer`: restricts answering to `admin` / `manager`, updates question row with answer details, triggers `sendQuestionAnsweredEmail()`.
- UI Components:
  - `src/components/tasks/task-questions.tsx`: Dedicated Q&A section with status badges (Amber Open, Emerald Answered), volunteer ask modal/composer, manager inline answer composer.
  - `src/app/(dashboard)/tasks/[id]/page.tsx`: Embedded separate from Comments & Feedback.
- Email Notifications:
  - `sendQuestionAskedEmail()` dispatches branded email with task link to all admin/manager accounts.
  - `sendQuestionAnsweredEmail()` dispatches branded email to the asking volunteer.

### Live End-to-End Verification (`scratch/verify_module9_e2e.mjs`)
- **Test 1**: Volunteer asks question on assigned task via `POST /api/questions` -> HTTP 201, verified row in `task_questions`, verified email dispatch via IMAP (Message-ID: `c086f9d4-7769-563f-5680-31f0e95eaef7@gmail.com`).
- **Test 2**: Unassigned volunteer attempts question on same task -> HTTP 403 Forbidden (`"Only the assigned volunteer can ask questions on this task"`).
- **Test 3**: Manager answers question via `PATCH /api/questions/[id]/answer` -> HTTP 200, row updated with `status = 'answered'`, `answered_by`, `answered_at`, verified email dispatch via IMAP (Message-ID: `a42b74ca-07e5-7590-2df5-2165efa42af3@gmail.com`).
- **Test 4**: `GET /api/tasks/:id` returns questions array with complete author and answer metadata.
- **Test 5**: Cleaned up all test data. Verified `tasks count = 0, task_questions count = 0`.

