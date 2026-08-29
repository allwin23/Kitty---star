-- Drop existing functions to avoid signature conflicts and ambiguity
drop function if exists public.create_submission_proof(uuid, text, text);
drop function if exists public.create_submission_proof(uuid, text, text, uuid);

-- Re-create the unified create_submission_proof RPC with optional task_id support
create or replace function public.create_submission_proof(
  p_submission_id uuid,
  p_image_url text,
  p_caption text default null,
  p_task_id uuid default null
)
returns public.submission_proofs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proof public.submission_proofs;
  v_plan_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  if not exists (
    select 1 from public.daily_submissions
    where id = p_submission_id and user_id = auth.uid()
  ) then
    raise exception 'Proofs can only be added to your submission.';
  end if;

  -- When task_id is supplied, verify it belongs to the same plan.
  if p_task_id is not null then
    select plan_id into v_plan_id
    from public.daily_submissions where id = p_submission_id;

    if not exists (
      select 1 from public.current_tasks
      where id = p_task_id and plan_id = v_plan_id
    ) then
      raise exception 'The task does not belong to this submission''s plan.';
    end if;
  end if;

  insert into public.submission_proofs (submission_id, image_url, caption, task_id)
  values (p_submission_id, p_image_url, nullif(btrim(p_caption), ''), p_task_id)
  returning * into v_proof;

  return v_proof;
end;
$$;

-- Grant EXECUTE permissions back to authenticated role
grant execute on function public.create_submission_proof(uuid, text, text, uuid) to authenticated;
