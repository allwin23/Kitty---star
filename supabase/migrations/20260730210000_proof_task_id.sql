-- Add task_id to submission_proofs so each proof can be linked to a specific task.
-- task_id is nullable: proofs uploaded before tasks were tagged keep working.
-- ON DELETE SET NULL: deleting a task doesn't delete its proof, just clears the link.

alter table public.submission_proofs
  add column if not exists task_id uuid references public.current_tasks (id) on delete set null;

-- Validate that when task_id is provided it belongs to the same plan as the submission.
-- This is enforced in the RPC, not a DB constraint, to keep things simple.

create index if not exists submission_proofs_task_idx on public.submission_proofs (task_id)
  where task_id is not null;

-- Replace the RPC with one that accepts an optional task_id.
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
    where id = p_submission_id and user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'Proofs can only be added to your pending submission.';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'proof-images' and name = p_image_url
  ) then
    raise exception 'Upload the proof image before registering it.';
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

-- Re-grant (idempotent — grant is additive so safe to repeat).
grant execute on function public.create_submission_proof(uuid, text, text, uuid) to authenticated;
