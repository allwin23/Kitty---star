create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  partner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_partner_is_not_self check (partner_id is null or partner_id <> id)
);

create table if not exists public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  used_by uuid references public.profiles (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint partner_invites_code_format check (code ~ '^[A-Z0-9]{8}$'),
  constraint partner_invites_usage_status check ((status = 'used') = (used_by is not null))
);

create index if not exists profiles_partner_id_idx on public.profiles (partner_id);
create index if not exists partner_invites_created_by_idx on public.partner_invites (created_by);
create index if not exists partner_invites_active_expires_at_idx
  on public.partner_invites (expires_at)
  where status = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.partner_invites enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can create their own invites" on public.partner_invites;
create policy "Users can create their own invites"
on public.partner_invites for insert
to authenticated
with check ((select auth.uid()) = created_by and used_by is null and status = 'active');

drop policy if exists "Users can read invites they created" on public.partner_invites;
create policy "Users can read invites they created"
on public.partner_invites for select
to authenticated
using ((select auth.uid()) = created_by);

create or replace function public.connect_partner_with_code(invite_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.partner_invites%rowtype;
  current_partner_id uuid;
  creator_partner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to connect with a partner.';
  end if;

  select * into invite
  from public.partner_invites
  where code = upper(trim(invite_code))
  for update;

  if not found then
    raise exception 'Invite code was not found.';
  end if;

  if invite.created_by = auth.uid() then
    raise exception 'You cannot use your own invite code.';
  end if;

  if invite.status <> 'active' or invite.used_by is not null then
    raise exception 'This invite code has already been used.';
  end if;

  if invite.expires_at <= now() then
    update public.partner_invites set status = 'expired' where id = invite.id;
    raise exception 'This invite code has expired.';
  end if;

  select partner_id into current_partner_id from public.profiles where id = auth.uid() for update;
  select partner_id into creator_partner_id from public.profiles where id = invite.created_by for update;

  if current_partner_id is not null or creator_partner_id is not null then
    raise exception 'One of these accounts is already connected to a partner.';
  end if;

  update public.profiles set partner_id = invite.created_by where id = auth.uid();
  update public.profiles set partner_id = auth.uid() where id = invite.created_by;
  update public.partner_invites
  set status = 'used', used_by = auth.uid()
  where id = invite.id;
end;
$$;

revoke all on function public.connect_partner_with_code(text) from public;
grant execute on function public.connect_partner_with_code(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
