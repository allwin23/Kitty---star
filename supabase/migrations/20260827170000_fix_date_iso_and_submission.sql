-- Fix date ISO/timezone handling, pomodoro completion, and partner submission
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

  -- Handle already finalized report
  if exists (select 1 from public.daily_reports where user_id = auth.uid() and date = p_date) then
    return jsonb_build_object('status', 'finalized');
  end if;

  -- Handle already existing plan (Idempotent success)
  select id into v_current_id from public.current_plans where user_id = auth.uid() and date = p_date;
  if v_current_id is not null then
    select id into v_initial_id from public.initial_plans where user_id = auth.uid() and date = p_date;
    return jsonb_build_object('initial_plan_id', v_initial_id, 'current_plan_id', v_current_id);
  end if;

  select id into v_draft_id from public.planner_drafts where user_id = auth.uid() and date = p_date for update;

  -- Fallback: If no draft exists or draft has no tasks, auto-create a default draft
  if v_draft_id is null then
    insert into public.planner_drafts (user_id, date)
    values (auth.uid(), p_date)
    on conflict (user_id, date) do update set updated_at = now()
    returning id into v_draft_id;
  end if;

  if not exists (select 1 from public.draft_tasks where draft_id = v_draft_id) then
    insert into public.draft_tasks (draft_id, title, estimated_minutes, "order")
    values (v_draft_id, 'Focus Session', 25, 0);
  end if;

  insert into public.initial_plans (user_id, date) values (auth.uid(), p_date) returning id into v_initial_id;
  insert into public.current_plans (user_id, date) values (auth.uid(), p_date) returning id into v_current_id;
  insert into public.initial_tasks (plan_id, title, estimated_minutes, "order")
  select v_initial_id, title, estimated_minutes, "order" from public.draft_tasks where draft_id = v_draft_id order by "order";
  insert into public.current_tasks (plan_id, title, estimated_minutes, "order")
  select v_current_id, title, estimated_minutes, "order" from public.draft_tasks where draft_id = v_draft_id order by "order";

  return jsonb_build_object('initial_plan_id', v_initial_id, 'current_plan_id', v_current_id);
end;
$$;

create or replace function public.create_draft(p_date date, p_tasks jsonb)
returns public.planner_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.planner_drafts;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
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
  if not exists (select 1 from public.current_plans where id = p_plan_id and user_id = auth.uid() and status in ('editing', 'submitted')) then
    raise exception 'Pomodoros can only be completed on an active plan.';
  end if;
  if p_session_type = 'focus' and p_task_id is not null and not exists (select 1 from public.current_tasks where id = p_task_id and plan_id = p_plan_id) then
    raise exception 'The selected task does not belong to this plan.';
  end if;
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
declare
  v_submission public.daily_submissions;
  v_partner_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not exists (select 1 from public.current_plans where id = p_plan_id and user_id = auth.uid() and status = 'editing') then
    raise exception 'Only your editing plan can be submitted.';
  end if;
  if not exists (select 1 from public.current_tasks where plan_id = p_plan_id) then
    raise exception 'A submitted plan requires at least one task.';
  end if;

  perform set_config('app.allow_plan_submission', 'true', true);
  update public.current_plans set status = 'submitted', submitted_at = now() where id = p_plan_id;

  insert into public.daily_submissions (user_id, plan_id, remark)
  values (auth.uid(), p_plan_id, nullif(btrim(p_remark), ''))
  returning * into v_submission;

  select partner_id into v_partner_id from public.profiles where id = auth.uid();
  if v_partner_id is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_partner_id, 'submission_received', 'Study day ready for review', 'Your partner submitted a study day for review.', jsonb_build_object('submission_id', v_submission.id));
  end if;

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
  if not exists (select 1 from public.daily_submissions where id = p_submission_id and user_id = auth.uid()) then
    raise exception 'Proofs can only be added to your submission.';
  end if;

  insert into public.submission_proofs (submission_id, image_url, caption)
  values (p_submission_id, p_image_url, nullif(btrim(p_caption), ''))
  returning * into v_proof;

  return v_proof;
end;
$$;
