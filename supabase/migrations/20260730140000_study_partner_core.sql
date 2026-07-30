-- Core Study Partner domain. Auth, profiles, and partner_invites are intentionally
-- left in the initial migration so the existing authentication flow remains unchanged.

create table public.planner_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.draft_tasks (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.planner_drafts (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  estimated_minutes integer not null check (estimated_minutes between 1 and 1440),
  "order" integer not null check ("order" >= 0),
  unique (draft_id, "order") deferrable initially immediate
);

create table public.initial_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.initial_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.initial_plans (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  estimated_minutes integer not null check (estimated_minutes between 1 and 1440),
  "order" integer not null check ("order" >= 0),
  unique (plan_id, "order") deferrable initially immediate
);

create table public.current_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  status text not null default 'editing' check (status in ('editing', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date),
  constraint current_plans_submission_timestamp check (
    (status = 'editing' and submitted_at is null) or (status = 'submitted' and submitted_at is not null)
  )
);

create table public.current_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.current_plans (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  estimated_minutes integer not null check (estimated_minutes between 1 and 1440),
  completed_minutes integer not null default 0 check (completed_minutes >= 0),
  completed_pomodoros integer not null default 0 check (completed_pomodoros >= 0),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  "order" integer not null check ("order" >= 0),
  unique (plan_id, "order") deferrable initially immediate
);

create table public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.current_plans (id) on delete cascade,
  task_id uuid references public.current_tasks (id) on delete cascade,
  duration integer not null check (duration between 1 and 180),
  session_type text not null check (session_type in ('focus', 'short_break', 'long_break')),
  completed boolean not null default true check (completed),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint pomodoro_sessions_time_order check (ended_at >= started_at),
  constraint pomodoro_sessions_focus_task check (
    (session_type = 'focus' and task_id is not null) or (session_type <> 'focus' and task_id is null)
  )
);

create table public.daily_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null unique references public.current_plans (id) on delete cascade,
  remark text check (char_length(remark) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.submission_proofs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.daily_submissions (id) on delete cascade,
  image_url text not null check (char_length(image_url) between 1 and 1024),
  caption text check (char_length(caption) <= 500),
  created_at timestamptz not null default now(),
  unique (submission_id, image_url)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.daily_submissions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  comment text check (char_length(comment) <= 2000),
  reviewed_at timestamptz not null default now()
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  planned_minutes integer not null check (planned_minutes >= 0),
  completed_minutes integer not null check (completed_minutes >= 0),
  planned_tasks integer not null check (planned_tasks >= 0),
  completed_tasks integer not null check (completed_tasks >= 0 and completed_tasks <= planned_tasks),
  total_pomodoros integer not null check (total_pomodoros >= 0),
  approval_status text not null check (approval_status in ('approved', 'rejected')),
  review_comment text,
  xp_earned integer not null default 0 check (xp_earned >= 0),
  streak_after_day integer not null default 0 check (streak_after_day >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.report_tasks (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  estimated_minutes integer not null check (estimated_minutes >= 0),
  completed_minutes integer not null check (completed_minutes >= 0),
  completed boolean not null,
  pomodoros integer not null check (pomodoros >= 0),
  "order" integer not null check ("order" >= 0),
  unique (report_id, "order")
);

create table public.user_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  total_minutes integer not null default 0 check (total_minutes >= 0),
  total_pomodoros integer not null default 0 check (total_pomodoros >= 0),
  planned_tasks integer not null default 0 check (planned_tasks >= 0),
  completed_tasks integer not null default 0 check (completed_tasks >= 0),
  approved_days integer not null default 0 check (approved_days >= 0),
  rejected_days integer not null default 0 check (rejected_days >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{3,64}$'),
  name text not null unique check (char_length(name) between 1 and 100),
  description text not null check (char_length(description) between 1 and 280),
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.xp_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{3,64}$'),
  name text not null unique check (char_length(name) between 1 and 100),
  xp_amount integer not null check (xp_amount >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('submission_received', 'submission_approved', 'submission_rejected', 'achievement_unlocked', 'partner_connected')),
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 500),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index planner_drafts_user_date_idx on public.planner_drafts (user_id, date desc);
create index draft_tasks_draft_order_idx on public.draft_tasks (draft_id, "order");
create index initial_plans_user_date_idx on public.initial_plans (user_id, date desc);
create index initial_tasks_plan_order_idx on public.initial_tasks (plan_id, "order");
create index current_plans_user_status_date_idx on public.current_plans (user_id, status, date desc);
create index current_tasks_plan_order_idx on public.current_tasks (plan_id, "order");
create index pomodoro_sessions_user_ended_idx on public.pomodoro_sessions (user_id, ended_at desc);
create index pomodoro_sessions_plan_task_idx on public.pomodoro_sessions (plan_id, task_id);
create index daily_submissions_user_status_idx on public.daily_submissions (user_id, status, submitted_at desc);
create index submission_proofs_submission_idx on public.submission_proofs (submission_id);
create index approvals_reviewer_reviewed_idx on public.approvals (reviewer_id, reviewed_at desc);
create index daily_reports_user_date_idx on public.daily_reports (user_id, date desc);
create index report_tasks_report_order_idx on public.report_tasks (report_id, "order");
create index user_achievements_user_unlocked_idx on public.user_achievements (user_id, unlocked_at desc);
create index notifications_user_read_created_idx on public.notifications (user_id, read_at, created_at desc);

create or replace function public.is_partner_of(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and partner_id = target_user_id
  );
$$;

create or replace function public.can_review_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.current_plans cp
    join public.profiles p on p.id = auth.uid()
    where cp.id = target_plan_id
      and cp.status = 'submitted'
      and p.partner_id = cp.user_id
  );
$$;

create or replace function public.set_task_completion_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.status := case when new.completed_minutes >= new.estimated_minutes then 'completed' else 'pending' end;
  return new;
end;
$$;

create or replace function public.guard_current_task_progress()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.completed_minutes, new.completed_pomodoros) is distinct from (old.completed_minutes, old.completed_pomodoros)
     and current_setting('app.allow_task_progress', true) is distinct from 'true' then
    raise exception 'Task progress can only be changed by a completed pomodoro.';
  end if;
  return new;
end;
$$;

create or replace function public.guard_current_plan_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.status, new.submitted_at) is distinct from (old.status, old.submitted_at)
     and current_setting('app.allow_plan_submission', true) is distinct from 'true' then
    raise exception 'Plan status can only be changed by submitting the day.';
  end if;
  return new;
end;
$$;

create or replace function public.apply_completed_pomodoro()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.completed and new.session_type = 'focus' then
    perform set_config('app.allow_task_progress', 'true', true);
    update public.current_tasks
    set completed_minutes = completed_minutes + new.duration,
        completed_pomodoros = completed_pomodoros + 1
    where id = new.task_id;
  end if;
  return new;
end;
$$;

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.user_id, new.type, new.title, new.body, new.data, new.created_at) is distinct from
     (old.user_id, old.type, old.title, old.body, old.data, old.created_at) then
    raise exception 'Only a notification read timestamp may be changed.';
  end if;
  return new;
end;
$$;

create or replace function public.ensure_user_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.create_partner_connected_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.partner_id is null and new.partner_id is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (new.id, 'partner_connected', 'Partner connected', 'Your study partner connection is ready.', jsonb_build_object('partner_id', new.partner_id));
  end if;
  return new;
end;
$$;

drop trigger if exists planner_drafts_set_updated_at on public.planner_drafts;
create trigger planner_drafts_set_updated_at before update on public.planner_drafts for each row execute function public.set_updated_at();
drop trigger if exists current_plans_set_updated_at on public.current_plans;
create trigger current_plans_set_updated_at before update on public.current_plans for each row execute function public.set_updated_at();
drop trigger if exists user_stats_set_updated_at on public.user_stats;
create trigger user_stats_set_updated_at before update on public.user_stats for each row execute function public.set_updated_at();
drop trigger if exists xp_rules_set_updated_at on public.xp_rules;
create trigger xp_rules_set_updated_at before update on public.xp_rules for each row execute function public.set_updated_at();
drop trigger if exists current_tasks_set_completion_status on public.current_tasks;
create trigger current_tasks_set_completion_status before insert or update on public.current_tasks for each row execute function public.set_task_completion_status();
drop trigger if exists current_tasks_guard_progress on public.current_tasks;
create trigger current_tasks_guard_progress before update on public.current_tasks for each row execute function public.guard_current_task_progress();
drop trigger if exists current_plans_guard_transition on public.current_plans;
create trigger current_plans_guard_transition before update on public.current_plans for each row execute function public.guard_current_plan_transition();
drop trigger if exists pomodoro_sessions_apply_completion on public.pomodoro_sessions;
create trigger pomodoro_sessions_apply_completion after insert on public.pomodoro_sessions for each row execute function public.apply_completed_pomodoro();
drop trigger if exists notifications_guard_update on public.notifications;
create trigger notifications_guard_update before update on public.notifications for each row execute function public.guard_notification_update();
drop trigger if exists profiles_ensure_user_stats on public.profiles;
create trigger profiles_ensure_user_stats after insert on public.profiles for each row execute function public.ensure_user_stats();
drop trigger if exists profiles_partner_connected_notification on public.profiles;
create trigger profiles_partner_connected_notification after update of partner_id on public.profiles for each row execute function public.create_partner_connected_notifications();

insert into public.user_stats (user_id)
select id from public.profiles on conflict (user_id) do nothing;

insert into public.achievements (code, name, description) values
  ('first_pomodoro', 'First Pomodoro', 'Complete your first focus session.'),
  ('first_approved_day', 'First Approved Day', 'Earn approval for your first submitted study day.'),
  ('seven_day_streak', '7 Day Streak', 'Maintain a seven-day approved study streak.'),
  ('hundred_pomodoros', '100 Pomodoros', 'Complete one hundred focus sessions.'),
  ('hundred_hours', '100 Hours Studied', 'Complete one hundred hours of focused study.')
on conflict (code) do update set name = excluded.name, description = excluded.description;

insert into public.xp_rules (code, name, xp_amount, active) values
  ('complete_pomodoro', 'Complete Pomodoro', 10, true),
  ('approved_day', 'Approved Day', 50, true),
  ('rejected_day', 'Rejected Day', 0, true),
  ('seven_day_streak', '7 Day Streak', 100, true)
on conflict (code) do nothing;

create or replace function public.create_draft(p_date date, p_tasks jsonb default '[]'::jsonb)
returns public.planner_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.planner_drafts;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_date < current_date then raise exception 'Draft dates cannot be in the past.'; end if;
  if jsonb_typeof(p_tasks) <> 'array' then raise exception 'Tasks must be a JSON array.'; end if;

  insert into public.planner_drafts (user_id, date)
  values (auth.uid(), p_date)
  on conflict (user_id, date) do update set updated_at = now()
  returning * into v_draft;

  delete from public.draft_tasks where draft_id = v_draft.id;
  insert into public.draft_tasks (draft_id, title, estimated_minutes, "order")
  select v_draft.id, btrim(value->>'title'), (value->>'estimated_minutes')::integer, ordinality - 1
  from jsonb_array_elements(p_tasks) with ordinality
  where char_length(btrim(value->>'title')) between 1 and 160
    and coalesce((value->>'estimated_minutes')::integer, 0) between 1 and 1440;

  if (select count(*) from public.draft_tasks where draft_id = v_draft.id) <> jsonb_array_length(p_tasks) then
    raise exception 'Each draft task requires a title and an estimated duration between 1 and 1440 minutes.';
  end if;
  return v_draft;
end;
$$;

create or replace function public.duplicate_draft_into_daily_plans(p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft_id uuid;
  v_initial_id uuid;
  v_current_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_date <> current_date then raise exception 'Daily plans can only be created for the current date.'; end if;
  if exists (select 1 from public.daily_reports where user_id = auth.uid() and date = p_date) then raise exception 'A permanent report already exists for this date.'; end if;
  if exists (select 1 from public.current_plans where user_id = auth.uid() and date = p_date) then raise exception 'Daily plans already exist for this date.'; end if;
  select id into v_draft_id from public.planner_drafts where user_id = auth.uid() and date = p_date for update;
  if v_draft_id is null then raise exception 'Create a draft before creating today''s plans.'; end if;
  if not exists (select 1 from public.draft_tasks where draft_id = v_draft_id) then raise exception 'A daily plan requires at least one task.'; end if;

  insert into public.initial_plans (user_id, date) values (auth.uid(), p_date) returning id into v_initial_id;
  insert into public.current_plans (user_id, date) values (auth.uid(), p_date) returning id into v_current_id;
  insert into public.initial_tasks (plan_id, title, estimated_minutes, "order")
  select v_initial_id, title, estimated_minutes, "order" from public.draft_tasks where draft_id = v_draft_id order by "order";
  insert into public.current_tasks (plan_id, title, estimated_minutes, "order")
  select v_current_id, title, estimated_minutes, "order" from public.draft_tasks where draft_id = v_draft_id order by "order";
  return jsonb_build_object('initial_plan_id', v_initial_id, 'current_plan_id', v_current_id);
end;
$$;

create or replace function public.complete_pomodoro(
  p_plan_id uuid,
  p_task_id uuid,
  p_duration integer,
  p_session_type text default 'focus',
  p_started_at timestamptz default now() - interval '25 minutes',
  p_ended_at timestamptz default now()
)
returns public.pomodoro_sessions
language plpgsql
security definer
set search_path = public
as $$
declare v_session public.pomodoro_sessions;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_session_type not in ('focus', 'short_break', 'long_break') then raise exception 'Invalid pomodoro session type.'; end if;
  if not exists (select 1 from public.current_plans where id = p_plan_id and user_id = auth.uid() and status = 'editing') then raise exception 'Pomodoros can only be completed on your active editing plan.'; end if;
  if p_session_type = 'focus' and not exists (select 1 from public.current_tasks where id = p_task_id and plan_id = p_plan_id) then raise exception 'The selected task does not belong to this plan.'; end if;
  if p_session_type <> 'focus' then p_task_id := null; end if;
  insert into public.pomodoro_sessions (user_id, plan_id, task_id, duration, session_type, completed, started_at, ended_at)
  values (auth.uid(), p_plan_id, p_task_id, p_duration, p_session_type, true, p_started_at, p_ended_at)
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function public.submit_day(p_plan_id uuid, p_remark text default null)
returns public.daily_submissions
language plpgsql
security definer
set search_path = public
as $$
declare v_submission public.daily_submissions;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and partner_id is not null) then raise exception 'Connect a study partner before submitting a day.'; end if;
  if not exists (select 1 from public.current_plans where id = p_plan_id and user_id = auth.uid() and status = 'editing') then raise exception 'Only your editing plan can be submitted.'; end if;
  if not exists (select 1 from public.current_tasks where plan_id = p_plan_id) then raise exception 'A submitted plan requires at least one task.'; end if;
  perform set_config('app.allow_plan_submission', 'true', true);
  update public.current_plans set status = 'submitted', submitted_at = now() where id = p_plan_id;
  insert into public.daily_submissions (user_id, plan_id, remark)
  values (auth.uid(), p_plan_id, nullif(btrim(p_remark), ''))
  returning * into v_submission;
  insert into public.notifications (user_id, type, title, body, data)
  select partner_id, 'submission_received', 'Study day ready for review', 'Your partner submitted a study day for review.', jsonb_build_object('submission_id', v_submission.id)
  from public.profiles where id = auth.uid();
  return v_submission;
end;
$$;

create or replace function public.create_submission_proof(p_submission_id uuid, p_image_url text, p_caption text default null)
returns public.submission_proofs
language plpgsql
security definer
set search_path = public
as $$
declare v_proof public.submission_proofs;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (select 1 from public.daily_submissions where id = p_submission_id and user_id = auth.uid() and status = 'pending') then raise exception 'Proofs can only be added to your pending submission.'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'proof-images' and name = p_image_url) then raise exception 'Upload the proof image before registering it.'; end if;
  insert into public.submission_proofs (submission_id, image_url, caption)
  values (p_submission_id, p_image_url, nullif(btrim(p_caption), '')) returning * into v_proof;
  return v_proof;
end;
$$;

create or replace function public.calculate_day_xp(p_status text, p_focus_pomodoros integer, p_streak integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select xp_amount from public.xp_rules where code = 'complete_pomodoro' and active), 0) * greatest(p_focus_pomodoros, 0)
       + case when p_status = 'approved' then coalesce((select xp_amount from public.xp_rules where code = 'approved_day' and active), 0) else coalesce((select xp_amount from public.xp_rules where code = 'rejected_day' and active), 0) end
       + case when p_status = 'approved' and p_streak = 7 then coalesce((select xp_amount from public.xp_rules where code = 'seven_day_streak' and active), 0) else 0 end;
$$;

create or replace function public.recalculate_user_stats(p_user_id uuid)
returns public.user_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats public.user_stats;
  v_last_date date;
  v_cursor date;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_running_streak integer := 0;
  v_previous_date date;
  r record;
begin
  insert into public.user_stats (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select max(date) into v_last_date from public.daily_reports where user_id = p_user_id;
  v_cursor := v_last_date;
  while v_cursor is not null and exists (select 1 from public.daily_reports where user_id = p_user_id and date = v_cursor and approval_status = 'approved') loop
    v_current_streak := v_current_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;
  for r in select date, approval_status from public.daily_reports where user_id = p_user_id order by date loop
    if r.approval_status = 'approved' then
      if v_previous_date = r.date - 1 then
        v_running_streak := v_running_streak + 1;
      else
        v_running_streak := 1;
      end if;
      v_longest_streak := greatest(v_longest_streak, v_running_streak);
    else
      v_running_streak := 0;
    end if;
    v_previous_date := r.date;
  end loop;
  update public.user_stats set
    total_minutes = coalesce((select sum(completed_minutes) from public.daily_reports where user_id = p_user_id), 0),
    total_pomodoros = coalesce((select sum(total_pomodoros) from public.daily_reports where user_id = p_user_id), 0),
    planned_tasks = coalesce((select sum(planned_tasks) from public.daily_reports where user_id = p_user_id), 0),
    completed_tasks = coalesce((select sum(completed_tasks) from public.daily_reports where user_id = p_user_id), 0),
    approved_days = (select count(*) from public.daily_reports where user_id = p_user_id and approval_status = 'approved'),
    rejected_days = (select count(*) from public.daily_reports where user_id = p_user_id and approval_status = 'rejected'),
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    xp = coalesce((select sum(xp_earned) from public.daily_reports where user_id = p_user_id), 0),
    level = greatest(1, floor(sqrt(coalesce((select sum(xp_earned) from public.daily_reports where user_id = p_user_id), 0)::numeric / 100))::integer + 1)
  where user_id = p_user_id returning * into v_stats;
  return v_stats;
end;
$$;

create or replace function public.unlock_user_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_stats public.user_stats;
begin
  select * into v_stats from public.user_stats where user_id = p_user_id;
  if not found then return; end if;
  insert into public.user_achievements (user_id, achievement_id)
  select p_user_id, a.id
  from public.achievements a
  where (a.code = 'first_pomodoro' and v_stats.total_pomodoros >= 1)
     or (a.code = 'first_approved_day' and v_stats.approved_days >= 1)
     or (a.code = 'seven_day_streak' and v_stats.longest_streak >= 7)
     or (a.code = 'hundred_pomodoros' and v_stats.total_pomodoros >= 100)
     or (a.code = 'hundred_hours' and v_stats.total_minutes >= 6000)
  on conflict (user_id, achievement_id) do nothing;
end;
$$;

create or replace function public.notify_achievement_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select new.user_id, 'achievement_unlocked', 'Achievement unlocked', a.name, jsonb_build_object('achievement_id', a.id, 'code', a.code)
  from public.achievements a where a.id = new.achievement_id;
  return new;
end;
$$;

create or replace function public.after_report_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_user_stats(new.user_id);
  perform public.unlock_user_achievements(new.user_id);
  return new;
end;
$$;

drop trigger if exists user_achievements_notify_unlock on public.user_achievements;
create trigger user_achievements_notify_unlock after insert on public.user_achievements for each row execute function public.notify_achievement_unlock();
drop trigger if exists daily_reports_recalculate_stats on public.daily_reports;
create trigger daily_reports_recalculate_stats after insert on public.daily_reports for each row execute function public.after_report_created();

create or replace function public.finalize_day(p_submission_id uuid)
returns public.daily_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.daily_submissions;
  v_plan public.current_plans;
  v_approval public.approvals;
  v_report public.daily_reports;
  v_streak integer := 0;
  v_pomodoros integer;
  v_completed_minutes integer;
  v_completed_tasks integer;
  v_xp integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select * into v_submission from public.daily_submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission was not found.'; end if;
  if v_submission.status not in ('approved', 'rejected') then raise exception 'A decision is required before finalization.'; end if;
  if not (auth.uid() = v_submission.user_id or public.is_partner_of(v_submission.user_id)) then raise exception 'You cannot finalize this submission.'; end if;
  select * into v_plan from public.current_plans where id = v_submission.plan_id for update;
  select * into v_approval from public.approvals where submission_id = v_submission.id;
  if not found then raise exception 'Approval record was not found.'; end if;
  if exists (select 1 from public.daily_reports where user_id = v_submission.user_id and date = v_plan.date) then raise exception 'This day has already been finalized.'; end if;

  if v_submission.status = 'approved' then
    select coalesce(streak_after_day, 0) + 1 into v_streak
    from public.daily_reports where user_id = v_submission.user_id and approval_status = 'approved' and date = v_plan.date - 1;
    v_streak := coalesce(v_streak, 1);
  end if;
  select count(*) into v_pomodoros from public.pomodoro_sessions where plan_id = v_plan.id and session_type = 'focus';
  select coalesce(sum(completed_minutes), 0), count(*) filter (where status = 'completed') into v_completed_minutes, v_completed_tasks from public.current_tasks where plan_id = v_plan.id;
  v_xp := public.calculate_day_xp(v_submission.status, v_pomodoros, v_streak);
  insert into public.daily_reports (user_id, date, planned_minutes, completed_minutes, planned_tasks, completed_tasks, total_pomodoros, approval_status, review_comment, xp_earned, streak_after_day)
  select v_submission.user_id, v_plan.date, coalesce(sum(estimated_minutes), 0), v_completed_minutes, count(*), v_completed_tasks, v_pomodoros, v_submission.status, v_approval.comment, v_xp, v_streak
  from public.current_tasks where plan_id = v_plan.id
  returning * into v_report;
  insert into public.report_tasks (report_id, title, estimated_minutes, completed_minutes, completed, pomodoros, "order")
  select v_report.id, ct.title, ct.estimated_minutes, ct.completed_minutes, ct.status = 'completed', ct.completed_pomodoros, ct."order"
  from public.current_tasks ct where ct.plan_id = v_plan.id order by ct."order";

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_submission.user_id,
    case when v_submission.status = 'approved' then 'submission_approved' else 'submission_rejected' end,
    case when v_submission.status = 'approved' then 'Study day approved' else 'Study day needs another try' end,
    coalesce(v_approval.comment, case when v_submission.status = 'approved' then 'Your partner approved your study day.' else 'Your partner reviewed your study day.' end),
    jsonb_build_object('report_id', v_report.id, 'date', v_plan.date)
  );
  -- Removing storage object rows invokes Supabase Storage's object cleanup and the
  -- submission cascade removes every temporary relational record.
  delete from storage.objects where bucket_id = 'proof-images' and name in (
    select image_url from public.submission_proofs where submission_id = v_submission.id
  );
  delete from public.initial_plans where user_id = v_submission.user_id and date = v_plan.date;
  delete from public.daily_submissions where id = v_submission.id;
  delete from public.current_plans where id = v_plan.id;
  return v_report;
end;
$$;

create or replace function public.review_submission(p_submission_id uuid, p_decision text, p_comment text default null)
returns public.daily_reports
language plpgsql
security definer
set search_path = public
as $$
declare v_submission public.daily_submissions; v_report public.daily_reports;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decision must be approved or rejected.'; end if;
  select * into v_submission from public.daily_submissions where id = p_submission_id for update;
  if not found or v_submission.status <> 'pending' then raise exception 'This submission is no longer awaiting review.'; end if;
  if not public.is_partner_of(v_submission.user_id) then raise exception 'Only the linked study partner can review this submission.'; end if;
  if not exists (select 1 from public.submission_proofs where submission_id = p_submission_id) then raise exception 'At least one proof image is required before review.'; end if;
  update public.daily_submissions set status = p_decision where id = p_submission_id;
  insert into public.approvals (submission_id, reviewer_id, decision, comment)
  values (p_submission_id, auth.uid(), p_decision, nullif(btrim(p_comment), ''));
  select * into v_report from public.finalize_day(p_submission_id);
  return v_report;
end;
$$;

create or replace function public.approve_day(p_submission_id uuid, p_comment text default null)
returns public.daily_reports language sql security definer set search_path = public as $$
  select * from public.review_submission(p_submission_id, 'approved', p_comment);
$$;

create or replace function public.reject_day(p_submission_id uuid, p_comment text default null)
returns public.daily_reports language sql security definer set search_path = public as $$
  select * from public.review_submission(p_submission_id, 'rejected', p_comment);
$$;

-- Compatibility RPC names for the existing invite-code flow.
create or replace function public.generate_invite(p_expires_at timestamptz default now() + interval '7 days')
returns public.partner_invites
language plpgsql security definer set search_path = public as $$
declare v_invite public.partner_invites; v_code text;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and partner_id is not null) then raise exception 'You are already connected to a partner.'; end if;
  loop
    v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
    begin
      insert into public.partner_invites (code, created_by, expires_at) values (v_code, auth.uid(), p_expires_at) returning * into v_invite;
      return v_invite;
    exception when unique_violation then end;
  end loop;
end;
$$;

create or replace function public.redeem_invite(p_invite_code text)
returns void language sql security definer set search_path = public as $$
  select public.connect_partner_with_code(p_invite_code);
$$;

alter table public.planner_drafts enable row level security;
alter table public.draft_tasks enable row level security;
alter table public.initial_plans enable row level security;
alter table public.initial_tasks enable row level security;
alter table public.current_plans enable row level security;
alter table public.current_tasks enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.daily_submissions enable row level security;
alter table public.submission_proofs enable row level security;
alter table public.approvals enable row level security;
alter table public.daily_reports enable row level security;
alter table public.report_tasks enable row level security;
alter table public.user_stats enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.xp_rules enable row level security;
alter table public.notifications enable row level security;

create policy "draft owners manage drafts" on public.planner_drafts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "draft owners manage tasks" on public.draft_tasks for all to authenticated using (exists (select 1 from public.planner_drafts d where d.id = draft_id and d.user_id = (select auth.uid()))) with check (exists (select 1 from public.planner_drafts d where d.id = draft_id and d.user_id = (select auth.uid())));
create policy "owners and reviewers read initial plans" on public.initial_plans for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.current_plans cp where cp.user_id = initial_plans.user_id and cp.date = initial_plans.date and public.can_review_plan(cp.id)));
create policy "owners and reviewers read initial tasks" on public.initial_tasks for select to authenticated using (exists (select 1 from public.initial_plans ip where ip.id = plan_id and (ip.user_id = (select auth.uid()) or exists (select 1 from public.current_plans cp where cp.user_id = ip.user_id and cp.date = ip.date and public.can_review_plan(cp.id)))));
create policy "owners and reviewers read current plans" on public.current_plans for select to authenticated using (user_id = (select auth.uid()) or public.can_review_plan(id));
create policy "owners edit current tasks before submission" on public.current_tasks for insert to authenticated with check (exists (select 1 from public.current_plans cp where cp.id = plan_id and cp.user_id = (select auth.uid()) and cp.status = 'editing'));
create policy "owners update current tasks before submission" on public.current_tasks for update to authenticated using (exists (select 1 from public.current_plans cp where cp.id = plan_id and cp.user_id = (select auth.uid()) and cp.status = 'editing')) with check (exists (select 1 from public.current_plans cp where cp.id = plan_id and cp.user_id = (select auth.uid()) and cp.status = 'editing'));
create policy "owners delete current tasks before submission" on public.current_tasks for delete to authenticated using (exists (select 1 from public.current_plans cp where cp.id = plan_id and cp.user_id = (select auth.uid()) and cp.status = 'editing'));
create policy "owners and reviewers read current tasks" on public.current_tasks for select to authenticated using (exists (select 1 from public.current_plans cp where cp.id = plan_id and (cp.user_id = (select auth.uid()) or public.can_review_plan(cp.id))));
create policy "owners and reviewers read pomodoros" on public.pomodoro_sessions for select to authenticated using (user_id = (select auth.uid()) or public.can_review_plan(plan_id));
create policy "owners and reviewers read submissions" on public.daily_submissions for select to authenticated using (user_id = (select auth.uid()) or public.is_partner_of(user_id));
create policy "owners update their pending proof records" on public.submission_proofs for all to authenticated using (exists (select 1 from public.daily_submissions ds where ds.id = submission_id and ds.user_id = (select auth.uid()) and ds.status = 'pending')) with check (exists (select 1 from public.daily_submissions ds where ds.id = submission_id and ds.user_id = (select auth.uid()) and ds.status = 'pending'));
create policy "owners and reviewers read proofs" on public.submission_proofs for select to authenticated using (exists (select 1 from public.daily_submissions ds where ds.id = submission_id and (ds.user_id = (select auth.uid()) or public.is_partner_of(ds.user_id))));
create policy "owners and reviewers read approvals" on public.approvals for select to authenticated using (exists (select 1 from public.daily_submissions ds where ds.id = submission_id and (ds.user_id = (select auth.uid()) or public.is_partner_of(ds.user_id))));
create policy "owners read reports" on public.daily_reports for select to authenticated using (user_id = (select auth.uid()));
create policy "owners read report tasks" on public.report_tasks for select to authenticated using (exists (select 1 from public.daily_reports dr where dr.id = report_id and dr.user_id = (select auth.uid())));
create policy "owners read stats" on public.user_stats for select to authenticated using (user_id = (select auth.uid()));
create policy "authenticated users read achievements" on public.achievements for select to authenticated using (true);
create policy "owners read earned achievements" on public.user_achievements for select to authenticated using (user_id = (select auth.uid()));
create policy "authenticated users read active xp rules" on public.xp_rules for select to authenticated using (active);
create policy "owners read notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "owners mark notifications read" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proof-images', 'proof-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "owners upload pending proof images" on storage.objects for insert to authenticated with check (
  bucket_id = 'proof-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.daily_submissions ds where ds.id::text = (storage.foldername(name))[2] and ds.user_id = (select auth.uid()) and ds.status = 'pending')
);
create policy "owners remove pending proof images" on storage.objects for delete to authenticated using (
  bucket_id = 'proof-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.daily_submissions ds where ds.id::text = (storage.foldername(name))[2] and ds.user_id = (select auth.uid()) and ds.status = 'pending')
);
create policy "owners and reviewers read proof images" on storage.objects for select to authenticated using (
  bucket_id = 'proof-images' and exists (
    select 1 from public.submission_proofs sp join public.daily_submissions ds on ds.id = sp.submission_id
    where sp.image_url = storage.objects.name and (ds.user_id = (select auth.uid()) or public.is_partner_of(ds.user_id))
  )
);

create policy "users delete their own avatars" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
);

grant execute on function public.is_partner_of(uuid), public.can_review_plan(uuid), public.create_draft(date, jsonb), public.duplicate_draft_into_daily_plans(date), public.complete_pomodoro(uuid, uuid, integer, text, timestamptz, timestamptz), public.submit_day(uuid, text), public.create_submission_proof(uuid, text, text), public.approve_day(uuid, text), public.reject_day(uuid, text), public.finalize_day(uuid), public.generate_invite(timestamptz), public.redeem_invite(text) to authenticated;
revoke all on function public.recalculate_user_stats(uuid), public.unlock_user_achievements(uuid), public.calculate_day_xp(text, integer, integer), public.review_submission(uuid, text, text) from public;
grant execute on function public.recalculate_user_stats(uuid), public.unlock_user_achievements(uuid), public.calculate_day_xp(text, integer, integer) to service_role;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'current_plans') then alter publication supabase_realtime add table public.current_plans; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'current_tasks') then alter publication supabase_realtime add table public.current_tasks; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_submissions') then alter publication supabase_realtime add table public.daily_submissions; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then alter publication supabase_realtime add table public.notifications; end if;
end;
$$;
