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
Not yet implemented end-to-end:
- `@dnd-kit` is already installed in `package.json`
- A `kanban-board.tsx` component exists, but it is not connected to live task state or DB mutation logic
- Must support the 5-state transition workflow and enforce task rules

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

## End-of-Report Notes

This handoff reflects the actual codebase as it exists now. The foundation is live and verified, the portal shell and auth flow are working, and the project is ready for the next module in the ordered roadmap. The most important next move is to continue with Module 5 in sequence, without skipping ahead into kanban, notifications, or analytics until the task creation and route logic have been fully hardened and verified.
