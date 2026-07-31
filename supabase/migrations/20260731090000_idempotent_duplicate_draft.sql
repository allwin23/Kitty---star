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
