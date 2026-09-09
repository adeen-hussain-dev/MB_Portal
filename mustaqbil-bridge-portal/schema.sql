-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role USER-DEFINED NOT NULL DEFAULT 'volunteer'::user_role,
  domain text,
  status text NOT NULL DEFAULT 'active'::text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status USER-DEFINED NOT NULL DEFAULT 'todo'::task_status,
  priority USER-DEFINED NOT NULL DEFAULT 'medium'::task_priority,
  assignee_id uuid,
  created_by uuid NOT NULL,
  domain text,
  due_date date,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT tasks_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.task_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.task_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT task_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT activity_log_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- ============================================================================
-- RLS Policies Reference (Role-Checked via security definer get_my_role())
-- Rule: Always use get_my_role(), never a raw subquery on profiles.
-- ============================================================================
-- drop policy if exists "profiles viewable by all authenticated users" on public.profiles;
-- drop policy if exists "Profiles are viewable by everyone" on public.profiles;
-- drop policy if exists "Enable read access for all users" on public.profiles;
-- drop policy if exists "Users can view all profiles" on public.profiles;
-- drop policy if exists "profiles_select_policy" on public.profiles;

-- create policy "profiles_select_policy"
-- on public.profiles for select to authenticated
-- using (auth.uid() = id or get_my_role() in ('admin', 'manager'));

-- drop policy if exists "task visibility by role" on public.tasks;
-- drop policy if exists "Tasks are viewable by everyone" on public.tasks;
-- drop policy if exists "tasks_select_policy" on public.tasks;

-- create policy "tasks_select_policy"
-- on public.tasks for select to authenticated
-- using (assignee_id = auth.uid() or get_my_role() in ('admin', 'manager'));

-- drop policy if exists "activity log follows task visibility" on public.activity_log;
-- drop policy if exists "activity_log_select_policy" on public.activity_log;

-- create policy "activity_log_select_policy"
-- on public.activity_log for select to authenticated
-- using (get_my_role() = 'admin');