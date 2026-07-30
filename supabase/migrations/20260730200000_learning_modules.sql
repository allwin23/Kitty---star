-- =============================================================
-- LEARNING MODULES — COMPLETE MIGRATION
-- Enums, tables, indexes, triggers, RLS, RPCs
-- Safe to run on a clean slate; idempotent throughout.
-- =============================================================

-- ─── ENUMS ────────────────────────────────────────────────────

do $$ begin
  create type public.flashcard_type as enum ('builtin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.flashcard_review_rating as enum ('again', 'hard', 'good', 'easy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_event_visibility as enum ('private', 'partner', 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_event_type as enum (
    'planner_created', 'planner_updated', 'task_completed',
    'pomodoro_started', 'pomodoro_completed',
    'pyq_started', 'pyq_completed', 'grammar_completed',
    'vocabulary_learned', 'flashcard_created', 'flashcard_reviewed',
    'water_logged', 'submission_sent', 'submission_approved',
    'submission_rejected', 'achievement_unlocked', 'level_up',
    'streak_increased', 'daily_goal_completed', 'partner_connected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mascot_emotion as enum (
    'happy', 'celebrate', 'encourage', 'remind', 'concerned'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mascot_priority as enum ('low', 'normal', 'high', 'critical');
exception when duplicate_object then null; end $$;

-- ─── TABLES ───────────────────────────────────────────────────

create table if not exists public.pyq_attempts (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references public.profiles (id) on delete cascade,
  set_name            text        not null check (char_length(btrim(set_name)) between 1 and 160),
  subject             text        not null check (char_length(btrim(subject)) between 1 and 120),
  year                integer     not null check (year between 1900 and 2100),
  mode                text        not null check (char_length(btrim(mode)) between 1 and 40),
  started_at          timestamptz not null default now(),
  submitted_at        timestamptz,
  score               numeric(7,2) not null default 0 check (score >= 0),
  correct             integer     not null default 0 check (correct >= 0),
  wrong               integer     not null default 0 check (wrong >= 0),
  unanswered          integer     not null default 0 check (unanswered >= 0),
  accuracy            numeric(5,2) not null default 0 check (accuracy between 0 and 100),
  time_taken_seconds  integer     not null default 0 check (time_taken_seconds >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint pyq_attempts_answer_totals_check
    check (correct + wrong + unanswered >= 0),
  constraint pyq_attempts_submission_time_check
    check (submitted_at is null or submitted_at >= started_at)
);

create table if not exists public.pyq_attempt_answers (
  id                  uuid        primary key default gen_random_uuid(),
  attempt_id          uuid        not null references public.pyq_attempts (id) on delete cascade,
  question_id         text        not null check (char_length(btrim(question_id)) between 1 and 160),
  selected_option     text        check (char_length(btrim(selected_option)) between 1 and 160),
  correct             boolean     not null,
  time_taken_seconds  integer     not null default 0 check (time_taken_seconds >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table if not exists public.pyq_stats (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null unique references public.profiles (id) on delete cascade,
  total_tests       integer     not null default 0 check (total_tests >= 0),
  total_questions   integer     not null default 0 check (total_questions >= 0),
  correct_answers   integer     not null default 0 check (correct_answers >= 0),
  wrong_answers     integer     not null default 0 check (wrong_answers >= 0),
  accuracy          numeric(5,2) not null default 0 check (accuracy between 0 and 100),
  best_score        numeric(7,2) not null default 0 check (best_score >= 0),
  today_tests       integer     not null default 0 check (today_tests >= 0),
  today_questions   integer     not null default 0 check (today_questions >= 0),
  last_attempt_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.water_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  amount_ml   integer     not null check (amount_ml between 1 and 10000),
  logged_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.water_daily_stats (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  date             date        not null,
  total_ml         integer     not null default 0 check (total_ml >= 0),
  goal_ml          integer     not null default 2000 check (goal_ml between 1 and 20000),
  goal_completed   boolean     not null default false,
  current_streak   integer     not null default 0 check (current_streak >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, date),
  constraint water_daily_stats_goal_check
    check (goal_completed = (total_ml >= goal_ml))
);

create table if not exists public.vocabulary_progress (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  word_id     text        not null check (char_length(btrim(word_id)) between 1 and 160),
  learned     boolean     not null default false,
  learned_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, word_id),
  constraint vocabulary_progress_learned_at_check
    check (
      (learned = true  and learned_at is not null) or
      (learned = false and learned_at is null)
    )
);

create table if not exists public.vocabulary_stats (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null unique references public.profiles (id) on delete cascade,
  today_words     integer     not null default 0 check (today_words >= 0),
  total_words     integer     not null default 0 check (total_words >= 0),
  current_streak  integer     not null default 0 check (current_streak >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.grammar_attempts (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  set_name      text        not null check (char_length(btrim(set_name)) between 1 and 160),
  topic         text        not null check (char_length(btrim(topic)) between 1 and 160),
  correct       integer     not null default 0 check (correct >= 0),
  wrong         integer     not null default 0 check (wrong >= 0),
  score         numeric(7,2) not null default 0 check (score >= 0),
  completed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.grammar_stats (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null unique references public.profiles (id) on delete cascade,
  today_questions  integer     not null default 0 check (today_questions >= 0),
  today_correct    integer     not null default 0 check (today_correct >= 0),
  total_questions  integer     not null default 0 check (total_questions >= 0),
  accuracy         numeric(5,2) not null default 0 check (accuracy between 0 and 100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.flashcard_collections (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  title        text        not null check (char_length(btrim(title)) between 1 and 160),
  description  text        check (char_length(description) <= 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.flashcards (
  id             uuid                    primary key default gen_random_uuid(),
  collection_id  uuid                    not null references public.flashcard_collections (id) on delete restrict,
  created_by     uuid                    not null references public.profiles (id) on delete cascade,
  type           public.flashcard_type   not null default 'user',
  question       text                    not null check (char_length(btrim(question)) between 1 and 4000),
  answer         text                    not null check (char_length(btrim(answer)) between 1 and 4000),
  created_at     timestamptz             not null default now(),
  updated_at     timestamptz             not null default now()
);

create table if not exists public.flashcard_reviews (
  id           uuid                          primary key default gen_random_uuid(),
  card_id      uuid                          not null references public.flashcards (id) on delete restrict,
  user_id      uuid                          not null references public.profiles (id) on delete cascade,
  reviewed_at  timestamptz                   not null default now(),
  rating       public.flashcard_review_rating not null,
  created_at   timestamptz                   not null default now(),
  updated_at   timestamptz                   not null default now()
);

create table if not exists public.flashcard_schedule (
  id            uuid        primary key default gen_random_uuid(),
  card_id       uuid        not null references public.flashcards (id) on delete restrict,
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  next_review   timestamptz,
  last_review   timestamptz,
  ease_factor   numeric(4,2) not null default 2.50 check (ease_factor >= 1),
  interval_days integer     not null default 0 check (interval_days >= 0),
  repetitions   integer     not null default 0 check (repetitions >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (card_id, user_id),
  constraint flashcard_schedule_review_order_check
    check (next_review is null or last_review is null or next_review >= last_review)
);

create table if not exists public.daily_user_activity (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles (id) on delete cascade,
  date                  date        not null,
  study_minutes         integer     not null default 0 check (study_minutes >= 0),
  pomodoros_completed   integer     not null default 0 check (pomodoros_completed >= 0),
  planned_tasks         integer     not null default 0 check (planned_tasks >= 0),
  completed_tasks       integer     not null default 0 check (completed_tasks >= 0),
  water_ml              integer     not null default 0 check (water_ml >= 0),
  pyq_tests             integer     not null default 0 check (pyq_tests >= 0),
  pyq_questions         integer     not null default 0 check (pyq_questions >= 0),
  grammar_questions     integer     not null default 0 check (grammar_questions >= 0),
  grammar_correct       integer     not null default 0 check (grammar_correct >= 0),
  vocabulary_words      integer     not null default 0 check (vocabulary_words >= 0),
  flashcards_reviewed   integer     not null default 0 check (flashcards_reviewed >= 0),
  xp_earned             integer     not null default 0 check (xp_earned >= 0),
  achievements_unlocked integer     not null default 0 check (achievements_unlocked >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.activity_events (
  id              uuid                              primary key default gen_random_uuid(),
  user_id         uuid                              not null references public.profiles (id) on delete cascade,
  event_type      public.activity_event_type        not null,
  reference_table text                              check (reference_table is null or reference_table ~ '^[a-z][a-z0-9_]{0,62}$'),
  reference_id    uuid,
  metadata        jsonb                             not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  visibility      public.activity_event_visibility  not null default 'private',
  created_at      timestamptz                       not null default now(),
  updated_at      timestamptz                       not null default now(),
  constraint activity_events_reference_check
    check ((reference_table is null) = (reference_id is null))
);

create table if not exists public.mascot_feed (
  id            uuid                    primary key default gen_random_uuid(),
  user_id       uuid                    not null references public.profiles (id) on delete cascade,
  event_id      uuid                    references public.activity_events (id) on delete restrict,
  message_type  text                    not null check (char_length(btrim(message_type)) between 1 and 64),
  title         text                    not null check (char_length(btrim(title)) between 1 and 140),
  subtitle      text                    check (char_length(subtitle) <= 500),
  icon          text                    check (char_length(icon) between 1 and 120),
  emotion       public.mascot_emotion   not null,
  priority      public.mascot_priority  not null default 'normal',
  is_read       boolean                 not null default false,
  created_at    timestamptz             not null default now(),
  updated_at    timestamptz             not null default now()
);

-- ─── INDEXES ──────────────────────────────────────────────────

create index if not exists pyq_attempts_user_created_idx             on public.pyq_attempts (user_id, created_at desc);
create index if not exists pyq_attempts_user_lookup_idx              on public.pyq_attempts (user_id, subject, year, set_name);
create index if not exists pyq_attempt_answers_attempt_idx           on public.pyq_attempt_answers (attempt_id);
create index if not exists water_logs_user_logged_idx                on public.water_logs (user_id, logged_at desc);
create index if not exists water_daily_stats_user_date_idx           on public.water_daily_stats (user_id, date desc);
create index if not exists vocabulary_progress_user_learned_idx      on public.vocabulary_progress (user_id, learned, learned_at desc);
create index if not exists grammar_attempts_user_completed_idx       on public.grammar_attempts (user_id, completed_at desc);
create index if not exists grammar_attempts_user_topic_idx           on public.grammar_attempts (user_id, topic, set_name);
create index if not exists flashcard_collections_user_created_idx    on public.flashcard_collections (user_id, created_at desc);
create index if not exists flashcards_collection_created_idx         on public.flashcards (collection_id, created_at desc);
create index if not exists flashcards_created_by_idx                 on public.flashcards (created_by);
create index if not exists flashcard_reviews_user_reviewed_idx       on public.flashcard_reviews (user_id, reviewed_at desc);
create index if not exists flashcard_reviews_card_idx                on public.flashcard_reviews (card_id);
create index if not exists flashcard_schedule_user_next_review_idx   on public.flashcard_schedule (user_id, next_review);
create index if not exists daily_user_activity_user_date_idx         on public.daily_user_activity (user_id, date desc);
create index if not exists daily_user_activity_date_idx              on public.daily_user_activity (date desc);
create index if not exists activity_events_user_created_idx          on public.activity_events (user_id, created_at desc);
create index if not exists activity_events_visibility_created_idx    on public.activity_events (visibility, created_at desc);
create index if not exists activity_events_reference_idx             on public.activity_events (reference_table, reference_id);
create index if not exists mascot_feed_user_read_created_idx         on public.mascot_feed (user_id, is_read, created_at desc);
create index if not exists mascot_feed_event_idx                     on public.mascot_feed (event_id);

-- ─── TRIGGER FUNCTIONS ────────────────────────────────────────

create or replace function public.guard_pyq_attempt_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.submitted_at is not null then
    raise exception 'Submitted PYQ attempts are immutable.';
  end if;
  return new;
end;
$$;

create or replace function public.guard_pyq_attempt_answer_write()
returns trigger language plpgsql set search_path = public as $$
declare
  v_attempt_id uuid;
begin
  v_attempt_id := case when tg_op = 'DELETE' then old.attempt_id else new.attempt_id end;
  if exists (
    select 1 from public.pyq_attempts
    where id = v_attempt_id and submitted_at is not null
  ) then
    raise exception 'Answers for submitted PYQ attempts are immutable.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.guard_mascot_feed_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if (
    new.user_id, new.event_id, new.message_type, new.title, new.subtitle,
    new.icon, new.emotion, new.priority, new.created_at
  ) is distinct from (
    old.user_id, old.event_id, old.message_type, old.title, old.subtitle,
    old.icon, old.emotion, old.priority, old.created_at
  ) or (old.is_read and not new.is_read) then
    raise exception 'Mascot feed entries may only be marked as read.';
  end if;
  return new;
end;
$$;

create or replace function public.ensure_learning_module_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pyq_stats        (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.vocabulary_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.grammar_stats    (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ─── TRIGGERS ─────────────────────────────────────────────────

drop trigger if exists pyq_attempts_set_updated_at            on public.pyq_attempts;
drop trigger if exists pyq_attempt_answers_set_updated_at     on public.pyq_attempt_answers;
drop trigger if exists pyq_stats_set_updated_at               on public.pyq_stats;
drop trigger if exists water_logs_set_updated_at              on public.water_logs;
drop trigger if exists water_daily_stats_set_updated_at       on public.water_daily_stats;
drop trigger if exists vocabulary_progress_set_updated_at     on public.vocabulary_progress;
drop trigger if exists vocabulary_stats_set_updated_at        on public.vocabulary_stats;
drop trigger if exists grammar_attempts_set_updated_at        on public.grammar_attempts;
drop trigger if exists grammar_stats_set_updated_at           on public.grammar_stats;
drop trigger if exists flashcard_collections_set_updated_at   on public.flashcard_collections;
drop trigger if exists flashcards_set_updated_at              on public.flashcards;
drop trigger if exists flashcard_reviews_set_updated_at       on public.flashcard_reviews;
drop trigger if exists flashcard_schedule_set_updated_at      on public.flashcard_schedule;
drop trigger if exists daily_user_activity_set_updated_at     on public.daily_user_activity;
drop trigger if exists activity_events_set_updated_at         on public.activity_events;
drop trigger if exists mascot_feed_set_updated_at             on public.mascot_feed;
drop trigger if exists pyq_attempts_guard_update              on public.pyq_attempts;
drop trigger if exists pyq_attempt_answers_guard_write        on public.pyq_attempt_answers;
drop trigger if exists mascot_feed_guard_update               on public.mascot_feed;
drop trigger if exists profiles_ensure_learning_module_stats  on public.profiles;

create trigger pyq_attempts_set_updated_at
  before update on public.pyq_attempts
  for each row execute function public.set_updated_at();

create trigger pyq_attempt_answers_set_updated_at
  before update on public.pyq_attempt_answers
  for each row execute function public.set_updated_at();

create trigger pyq_stats_set_updated_at
  before update on public.pyq_stats
  for each row execute function public.set_updated_at();

create trigger water_logs_set_updated_at
  before update on public.water_logs
  for each row execute function public.set_updated_at();

create trigger water_daily_stats_set_updated_at
  before update on public.water_daily_stats
  for each row execute function public.set_updated_at();

create trigger vocabulary_progress_set_updated_at
  before update on public.vocabulary_progress
  for each row execute function public.set_updated_at();

create trigger vocabulary_stats_set_updated_at
  before update on public.vocabulary_stats
  for each row execute function public.set_updated_at();

create trigger grammar_attempts_set_updated_at
  before update on public.grammar_attempts
  for each row execute function public.set_updated_at();

create trigger grammar_stats_set_updated_at
  before update on public.grammar_stats
  for each row execute function public.set_updated_at();

create trigger flashcard_collections_set_updated_at
  before update on public.flashcard_collections
  for each row execute function public.set_updated_at();

create trigger flashcards_set_updated_at
  before update on public.flashcards
  for each row execute function public.set_updated_at();

create trigger flashcard_reviews_set_updated_at
  before update on public.flashcard_reviews
  for each row execute function public.set_updated_at();

create trigger flashcard_schedule_set_updated_at
  before update on public.flashcard_schedule
  for each row execute function public.set_updated_at();

create trigger daily_user_activity_set_updated_at
  before update on public.daily_user_activity
  for each row execute function public.set_updated_at();

create trigger activity_events_set_updated_at
  before update on public.activity_events
  for each row execute function public.set_updated_at();

create trigger mascot_feed_set_updated_at
  before update on public.mascot_feed
  for each row execute function public.set_updated_at();

create trigger pyq_attempts_guard_update
  before update on public.pyq_attempts
  for each row execute function public.guard_pyq_attempt_update();

create trigger pyq_attempt_answers_guard_write
  before insert or update or delete on public.pyq_attempt_answers
  for each row execute function public.guard_pyq_attempt_answer_write();

create trigger mascot_feed_guard_update
  before update on public.mascot_feed
  for each row execute function public.guard_mascot_feed_update();

create trigger profiles_ensure_learning_module_stats
  after insert on public.profiles
  for each row execute function public.ensure_learning_module_stats();

-- ─── BACKFILL STATS FOR EXISTING USERS ───────────────────────

insert into public.pyq_stats        (user_id) select id from public.profiles on conflict (user_id) do nothing;
insert into public.vocabulary_stats (user_id) select id from public.profiles on conflict (user_id) do nothing;
insert into public.grammar_stats    (user_id) select id from public.profiles on conflict (user_id) do nothing;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────

alter table public.pyq_attempts           enable row level security;
alter table public.pyq_attempt_answers    enable row level security;
alter table public.pyq_stats              enable row level security;
alter table public.water_logs             enable row level security;
alter table public.water_daily_stats      enable row level security;
alter table public.vocabulary_progress    enable row level security;
alter table public.vocabulary_stats       enable row level security;
alter table public.grammar_attempts       enable row level security;
alter table public.grammar_stats          enable row level security;
alter table public.flashcard_collections  enable row level security;
alter table public.flashcards             enable row level security;
alter table public.flashcard_reviews      enable row level security;
alter table public.flashcard_schedule     enable row level security;
alter table public.daily_user_activity    enable row level security;
alter table public.activity_events        enable row level security;
alter table public.mascot_feed            enable row level security;

-- ─── RLS POLICIES ─────────────────────────────────────────────

-- pyq_attempts
create policy "owners read pyq attempts"
  on public.pyq_attempts for select to authenticated
  using (user_id = (select auth.uid()));

-- pyq_attempt_answers
create policy "owners read pyq answers"
  on public.pyq_attempt_answers for select to authenticated
  using (exists (
    select 1 from public.pyq_attempts pa
    where pa.id = attempt_id and pa.user_id = (select auth.uid())
  ));

-- pyq_stats
create policy "owners read pyq stats"
  on public.pyq_stats for select to authenticated
  using (user_id = (select auth.uid()));

-- water_logs
create policy "owners read water logs"
  on public.water_logs for select to authenticated
  using (user_id = (select auth.uid()));

-- water_daily_stats
create policy "owners read water daily stats"
  on public.water_daily_stats for select to authenticated
  using (user_id = (select auth.uid()));

-- vocabulary_progress
create policy "owners manage vocabulary progress"
  on public.vocabulary_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- vocabulary_stats
create policy "owners read vocabulary stats"
  on public.vocabulary_stats for select to authenticated
  using (user_id = (select auth.uid()));

-- grammar_attempts
create policy "owners read grammar attempts"
  on public.grammar_attempts for select to authenticated
  using (user_id = (select auth.uid()));

-- grammar_stats
create policy "owners read grammar stats"
  on public.grammar_stats for select to authenticated
  using (user_id = (select auth.uid()));

-- flashcard_collections
create policy "owners read flashcard collections"
  on public.flashcard_collections for select to authenticated
  using (user_id = (select auth.uid()));

create policy "owners update flashcard collections"
  on public.flashcard_collections for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- flashcards
create policy "owners read user flashcards"
  on public.flashcards for select to authenticated
  using (exists (
    select 1 from public.flashcard_collections fc
    where fc.id = collection_id and fc.user_id = (select auth.uid())
  ));

-- flashcard_reviews
create policy "owners read flashcard reviews"
  on public.flashcard_reviews for select to authenticated
  using (
    user_id = (select auth.uid()) and
    exists (
      select 1 from public.flashcards f
      join public.flashcard_collections fc on fc.id = f.collection_id
      where f.id = card_id and fc.user_id = (select auth.uid())
    )
  );

-- flashcard_schedule
create policy "owners read flashcard schedules"
  on public.flashcard_schedule for select to authenticated
  using (
    user_id = (select auth.uid()) and
    exists (
      select 1 from public.flashcards f
      join public.flashcard_collections fc on fc.id = f.collection_id
      where f.id = card_id and fc.user_id = (select auth.uid())
    )
  );

-- daily_user_activity
create policy "owners read daily activity"
  on public.daily_user_activity for select to authenticated
  using (user_id = (select auth.uid()));

-- activity_events
create policy "activity events follow visibility"
  on public.activity_events for select to authenticated
  using (
    user_id = (select auth.uid()) or
    (visibility = 'partner' and public.is_partner_of(user_id)) or
    visibility = 'public'
  );

-- mascot_feed
create policy "owners read mascot feed"
  on public.mascot_feed for select to authenticated
  using (user_id = (select auth.uid()));

create policy "owners mark mascot feed read"
  on public.mascot_feed for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── INTERNAL HELPER FUNCTIONS ────────────────────────────────

create or replace function public.increment_daily_user_activity(
  p_user_id             uuid,
  p_date                date    default current_date,
  p_study_minutes       integer default 0,
  p_pomodoros_completed integer default 0,
  p_planned_tasks       integer default 0,
  p_completed_tasks     integer default 0,
  p_water_ml            integer default 0,
  p_pyq_tests           integer default 0,
  p_pyq_questions       integer default 0,
  p_grammar_questions   integer default 0,
  p_grammar_correct     integer default 0,
  p_vocabulary_words    integer default 0,
  p_flashcards_reviewed integer default 0,
  p_xp_earned           integer default 0,
  p_achievements_unlocked integer default 0
)
returns public.daily_user_activity
language plpgsql security definer set search_path = public
as $$
declare
  v_activity public.daily_user_activity;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You can only update your own daily activity.';
  end if;

  insert into public.daily_user_activity (
    user_id, date,
    study_minutes, pomodoros_completed, planned_tasks, completed_tasks,
    water_ml, pyq_tests, pyq_questions, grammar_questions, grammar_correct,
    vocabulary_words, flashcards_reviewed, xp_earned, achievements_unlocked
  ) values (
    p_user_id, p_date,
    p_study_minutes, p_pomodoros_completed, p_planned_tasks, p_completed_tasks,
    p_water_ml, p_pyq_tests, p_pyq_questions, p_grammar_questions, p_grammar_correct,
    p_vocabulary_words, p_flashcards_reviewed, p_xp_earned, p_achievements_unlocked
  )
  on conflict (user_id, date) do update set
    study_minutes         = daily_user_activity.study_minutes         + excluded.study_minutes,
    pomodoros_completed   = daily_user_activity.pomodoros_completed   + excluded.pomodoros_completed,
    planned_tasks         = daily_user_activity.planned_tasks         + excluded.planned_tasks,
    completed_tasks       = daily_user_activity.completed_tasks       + excluded.completed_tasks,
    water_ml              = daily_user_activity.water_ml              + excluded.water_ml,
    pyq_tests             = daily_user_activity.pyq_tests             + excluded.pyq_tests,
    pyq_questions         = daily_user_activity.pyq_questions         + excluded.pyq_questions,
    grammar_questions     = daily_user_activity.grammar_questions     + excluded.grammar_questions,
    grammar_correct       = daily_user_activity.grammar_correct       + excluded.grammar_correct,
    vocabulary_words      = daily_user_activity.vocabulary_words      + excluded.vocabulary_words,
    flashcards_reviewed   = daily_user_activity.flashcards_reviewed   + excluded.flashcards_reviewed,
    xp_earned             = daily_user_activity.xp_earned             + excluded.xp_earned,
    achievements_unlocked = daily_user_activity.achievements_unlocked + excluded.achievements_unlocked
  returning * into v_activity;

  return v_activity;
end;
$$;

create or replace function public.record_activity_event(
  p_event_type      public.activity_event_type,
  p_reference_table text,
  p_reference_id    uuid,
  p_metadata        jsonb,
  p_visibility      public.activity_event_visibility,
  p_message_type    text,
  p_title           text,
  p_subtitle        text,
  p_emotion         public.mascot_emotion  default 'happy',
  p_priority        public.mascot_priority default 'normal'
)
returns public.activity_events
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.activity_events;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  insert into public.activity_events (
    user_id, event_type, reference_table, reference_id, metadata, visibility
  ) values (
    auth.uid(), p_event_type, p_reference_table, p_reference_id, p_metadata, p_visibility
  )
  returning * into v_event;

  insert into public.mascot_feed (
    user_id, event_id, message_type, title, subtitle, emotion, priority
  ) values (
    auth.uid(), v_event.id,
    btrim(p_message_type), btrim(p_title),
    nullif(btrim(p_subtitle), ''),
    p_emotion, p_priority
  );

  return v_event;
end;
$$;

create or replace function public.award_module_xp(
  p_rule_code     text,
  p_activity_date date default current_date
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_xp integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select xp_amount into v_xp
  from public.xp_rules
  where code = p_rule_code and active;

  v_xp := coalesce(v_xp, 0);

  if v_xp > 0 then
    perform public.increment_daily_user_activity(
      auth.uid(), p_activity_date, p_xp_earned => v_xp
    );
    perform public.unlock_user_achievements(auth.uid());
  end if;

  return v_xp;
end;
$$;

create or replace function public.refresh_pyq_stats(p_user_id uuid)
returns public.pyq_stats
language plpgsql security definer set search_path = public
as $$
declare
  v_stats public.pyq_stats;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You can only refresh your own PYQ statistics.';
  end if;

  insert into public.pyq_stats (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update public.pyq_stats set
    total_tests     = (select count(*) from public.pyq_attempts
                       where user_id = p_user_id and submitted_at is not null),
    total_questions = coalesce((
                        select sum(correct + wrong + unanswered) from public.pyq_attempts
                        where user_id = p_user_id and submitted_at is not null), 0),
    correct_answers = coalesce((
                        select sum(correct) from public.pyq_attempts
                        where user_id = p_user_id and submitted_at is not null), 0),
    wrong_answers   = coalesce((
                        select sum(wrong) from public.pyq_attempts
                        where user_id = p_user_id and submitted_at is not null), 0),
    accuracy        = coalesce((
                        select round(100 * sum(correct)::numeric /
                               nullif(sum(correct + wrong + unanswered), 0), 2)
                        from public.pyq_attempts
                        where user_id = p_user_id and submitted_at is not null), 0),
    best_score      = coalesce((
                        select max(score) from public.pyq_attempts
                        where user_id = p_user_id and submitted_at is not null), 0),
    today_tests     = (select count(*) from public.pyq_attempts
                       where user_id = p_user_id and submitted_at::date = current_date),
    today_questions = coalesce((
                        select sum(correct + wrong + unanswered) from public.pyq_attempts
                        where user_id = p_user_id and submitted_at::date = current_date), 0),
    last_attempt_at = (select max(submitted_at) from public.pyq_attempts
                       where user_id = p_user_id and submitted_at is not null)
  where user_id = p_user_id
  returning * into v_stats;

  return v_stats;
end;
$$;

create or replace function public.refresh_vocabulary_stats(p_user_id uuid)
returns public.vocabulary_stats
language plpgsql security definer set search_path = public
as $$
declare
  v_stats  public.vocabulary_stats;
  v_day    date    := current_date;
  v_streak integer := 0;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You can only refresh your own vocabulary statistics.';
  end if;

  if exists (
    select 1 from public.vocabulary_progress
    where user_id = p_user_id and learned and learned_at::date = current_date
  ) then
    while exists (
      select 1 from public.vocabulary_progress
      where user_id = p_user_id and learned and learned_at::date = v_day
    ) loop
      v_streak := v_streak + 1;
      v_day    := v_day - 1;
    end loop;
  end if;

  insert into public.vocabulary_stats (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update public.vocabulary_stats set
    today_words    = (select count(*) from public.vocabulary_progress
                      where user_id = p_user_id and learned and learned_at::date = current_date),
    total_words    = (select count(*) from public.vocabulary_progress
                      where user_id = p_user_id and learned),
    current_streak = v_streak
  where user_id = p_user_id
  returning * into v_stats;

  return v_stats;
end;
$$;

create or replace function public.refresh_grammar_stats(p_user_id uuid)
returns public.grammar_stats
language plpgsql security definer set search_path = public
as $$
declare
  v_stats public.grammar_stats;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You can only refresh your own grammar statistics.';
  end if;

  insert into public.grammar_stats (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update public.grammar_stats set
    today_questions = coalesce((
                        select sum(correct + wrong) from public.grammar_attempts
                        where user_id = p_user_id and completed_at::date = current_date), 0),
    today_correct   = coalesce((
                        select sum(correct) from public.grammar_attempts
                        where user_id = p_user_id and completed_at::date = current_date), 0),
    total_questions = coalesce((
                        select sum(correct + wrong) from public.grammar_attempts
                        where user_id = p_user_id), 0),
    accuracy        = coalesce((
                        select round(100 * sum(correct)::numeric /
                               nullif(sum(correct + wrong), 0), 2)
                        from public.grammar_attempts
                        where user_id = p_user_id), 0)
  where user_id = p_user_id
  returning * into v_stats;

  return v_stats;
end;
$$;

-- ─── PUBLIC RPC FUNCTIONS ─────────────────────────────────────

create or replace function public.start_pyq_attempt(
  p_set_name text,
  p_subject  text,
  p_year     integer,
  p_mode     text
)
returns public.pyq_attempts
language plpgsql security definer set search_path = public
as $$
declare
  v_attempt public.pyq_attempts;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  if char_length(btrim(p_set_name)) not between 1 and 160
  or char_length(btrim(p_subject))  not between 1 and 120
  or p_year not between 1900 and 2100
  or char_length(btrim(p_mode))     not between 1 and 40 then
    raise exception 'PYQ attempt input is invalid.';
  end if;

  insert into public.pyq_attempts (user_id, set_name, subject, year, mode)
  values (auth.uid(), btrim(p_set_name), btrim(p_subject), p_year, btrim(p_mode))
  returning * into v_attempt;

  return v_attempt;
end;
$$;

create or replace function public.finish_pyq_attempt(p_attempt_id uuid, p_answers jsonb)
returns public.pyq_attempts
language plpgsql security definer set search_path = public
as $$
declare
  v_attempt          public.pyq_attempts;
  v_total            integer;
  v_correct          integer;
  v_wrong            integer;
  v_unanswered       integer;
  v_score            numeric(7,2);
  v_time_taken       integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 then
    raise exception 'At least one PYQ answer is required.';
  end if;

  select * into v_attempt
  from public.pyq_attempts
  where id = p_attempt_id and user_id = auth.uid()
  for update;

  if not found              then raise exception 'PYQ attempt was not found.'; end if;
  if v_attempt.submitted_at is not null then
    raise exception 'This PYQ attempt has already been submitted.';
  end if;

  select
    count(*),
    count(*) filter (where (a->>'correct')::boolean = true),
    count(*) filter (where (a->>'selected_option') is not null and (a->>'correct')::boolean = false),
    count(*) filter (where (a->>'selected_option') is null)
  into v_total, v_correct, v_wrong, v_unanswered
  from jsonb_array_elements(p_answers) as a;

  v_score      := round(100 * v_correct::numeric / nullif(v_total, 0), 2);
  v_time_taken := greatest(0, floor(extract(epoch from now() - v_attempt.started_at))::integer);

  insert into public.pyq_attempt_answers (
    attempt_id, question_id, selected_option, correct, time_taken_seconds
  )
  select
    p_attempt_id,
    btrim(a->>'question_id'),
    nullif(btrim(coalesce(a->>'selected_option', '')), ''),
    (a->>'correct')::boolean,
    coalesce((a->>'time_taken_seconds')::integer, 0)
  from jsonb_array_elements(p_answers) as a;

  update public.pyq_attempts set
    submitted_at       = now(),
    score              = v_score,
    correct            = v_correct,
    wrong              = v_wrong,
    unanswered         = v_unanswered,
    accuracy           = v_score,
    time_taken_seconds = v_time_taken
  where id = p_attempt_id
  returning * into v_attempt;

  perform public.refresh_pyq_stats(auth.uid());
  perform public.increment_daily_user_activity(
    auth.uid(), p_pyq_tests => 1, p_pyq_questions => v_total
  );
  perform public.award_module_xp('pyq_completed');
  perform public.record_activity_event(
    'pyq_completed', 'pyq_attempts', v_attempt.id,
    jsonb_build_object('score', v_score, 'correct', v_correct, 'wrong', v_wrong),
    'private', 'pyq_completed', 'PYQ test completed', 'You completed a PYQ test.',
    'celebrate'
  );

  return v_attempt;
end;
$$;

create or replace function public.log_water(p_amount_ml integer)
returns public.water_logs
language plpgsql security definer set search_path = public
as $$
declare
  v_log    public.water_logs;
  v_streak integer := 0;
  v_day    date    := current_date;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_amount_ml not between 1 and 10000 then
    raise exception 'Water amount must be between 1 and 10 000 ml.';
  end if;

  insert into public.water_logs (user_id, amount_ml)
  values (auth.uid(), p_amount_ml)
  returning * into v_log;

  insert into public.water_daily_stats (user_id, date, total_ml, goal_completed)
  values (auth.uid(), current_date, p_amount_ml, p_amount_ml >= 2000)
  on conflict (user_id, date) do update set
    total_ml       = water_daily_stats.total_ml + excluded.total_ml,
    goal_completed = water_daily_stats.total_ml + excluded.total_ml >= water_daily_stats.goal_ml;

  -- recompute streak
  if exists (
    select 1 from public.water_daily_stats
    where user_id = auth.uid() and date = current_date and goal_completed
  ) then
    while exists (
      select 1 from public.water_daily_stats
      where user_id = auth.uid() and date = v_day and goal_completed
    ) loop
      v_streak := v_streak + 1;
      v_day    := v_day - 1;
    end loop;
  end if;

  update public.water_daily_stats
  set current_streak = v_streak
  where user_id = auth.uid() and date = current_date;

  perform public.increment_daily_user_activity(auth.uid(), p_water_ml => p_amount_ml);
  perform public.award_module_xp('water_logged');
  perform public.record_activity_event(
    'water_logged', 'water_logs', v_log.id,
    jsonb_build_object('amount_ml', p_amount_ml),
    'private', 'water_logged', 'Water logged',
    format('You drank %s ml of water.', p_amount_ml),
    'happy'
  );

  return v_log;
end;
$$;

create or replace function public.mark_word_learned(p_word_id text)
returns public.vocabulary_progress
language plpgsql security definer set search_path = public
as $$
declare
  v_progress public.vocabulary_progress;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if char_length(btrim(p_word_id)) not between 1 and 160 then
    raise exception 'word_id is invalid.';
  end if;

  insert into public.vocabulary_progress (user_id, word_id, learned, learned_at)
  values (auth.uid(), btrim(p_word_id), true, now())
  on conflict (user_id, word_id) do nothing
  returning * into v_progress;

  if not found then
    raise exception 'This word is already marked as learned.';
  end if;

  perform public.refresh_vocabulary_stats(auth.uid());
  perform public.increment_daily_user_activity(auth.uid(), p_vocabulary_words => 1);
  perform public.award_module_xp('vocabulary_learned');
  perform public.record_activity_event(
    'vocabulary_learned', 'vocabulary_progress', v_progress.id,
    jsonb_build_object('word_id', v_progress.word_id),
    'private', 'vocabulary_learned', 'New word learned', 'You learned a new word.',
    'celebrate'
  );

  return v_progress;
end;
$$;

create or replace function public.finish_grammar_quiz(
  p_topic    text,
  p_correct  integer,
  p_wrong    integer,
  p_score    numeric,
  p_set_name text default 'default'
)
returns public.grammar_attempts
language plpgsql security definer set search_path = public
as $$
declare
  v_attempt   public.grammar_attempts;
  v_questions integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if char_length(btrim(p_topic))    not between 1 and 160
  or char_length(btrim(p_set_name)) not between 1 and 160
  or p_correct < 0 or p_wrong < 0 or p_score < 0 then
    raise exception 'Grammar quiz input is invalid.';
  end if;

  v_questions := p_correct + p_wrong;
  if v_questions = 0 then
    raise exception 'A grammar quiz must contain at least one question.';
  end if;

  insert into public.grammar_attempts (user_id, set_name, topic, correct, wrong, score)
  values (auth.uid(), btrim(p_set_name), btrim(p_topic), p_correct, p_wrong, p_score)
  returning * into v_attempt;

  perform public.refresh_grammar_stats(auth.uid());
  perform public.increment_daily_user_activity(
    auth.uid(), p_grammar_questions => v_questions, p_grammar_correct => p_correct
  );
  perform public.award_module_xp('grammar_completed');
  perform public.record_activity_event(
    'grammar_completed', 'grammar_attempts', v_attempt.id,
    jsonb_build_object(
      'topic', v_attempt.topic, 'score', v_attempt.score,
      'correct', v_attempt.correct, 'wrong', v_attempt.wrong
    ),
    'private', 'grammar_completed', 'Grammar quiz completed',
    'You completed a grammar quiz.', 'celebrate'
  );

  return v_attempt;
end;
$$;

create or replace function public.create_flashcard_collection(
  p_title       text,
  p_description text default null
)
returns public.flashcard_collections
language plpgsql security definer set search_path = public
as $$
declare
  v_collection public.flashcard_collections;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if char_length(btrim(p_title)) not between 1 and 160
  or char_length(p_description) > 1000 then
    raise exception 'Flashcard collection input is invalid.';
  end if;

  insert into public.flashcard_collections (user_id, title, description)
  values (auth.uid(), btrim(p_title), nullif(btrim(p_description), ''))
  returning * into v_collection;

  return v_collection;
end;
$$;

create or replace function public.create_flashcard(
  p_collection_id uuid,
  p_question      text,
  p_answer        text
)
returns public.flashcards
language plpgsql security definer set search_path = public
as $$
declare
  v_card public.flashcards;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if char_length(btrim(p_question)) not between 1 and 4000
  or char_length(btrim(p_answer))   not between 1 and 4000 then
    raise exception 'Flashcard question and answer are required.';
  end if;
  if not exists (
    select 1 from public.flashcard_collections
    where id = p_collection_id and user_id = auth.uid()
  ) then
    raise exception 'Flashcard collection was not found.';
  end if;

  insert into public.flashcards (collection_id, created_by, type, question, answer)
  values (p_collection_id, auth.uid(), 'user', btrim(p_question), btrim(p_answer))
  returning * into v_card;

  perform public.award_module_xp('flashcard_created');
  perform public.record_activity_event(
    'flashcard_created', 'flashcards', v_card.id,
    jsonb_build_object('collection_id', p_collection_id),
    'private', 'flashcard_created', 'Flashcard created',
    'You created a new flashcard.', 'happy'
  );

  return v_card;
end;
$$;

create or replace function public.update_flashcard(
  p_card_id       uuid,
  p_question      text,
  p_answer        text,
  p_collection_id uuid default null
)
returns public.flashcards
language plpgsql security definer set search_path = public
as $$
declare
  v_card          public.flashcards;
  v_collection_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if char_length(btrim(p_question)) not between 1 and 4000
  or char_length(btrim(p_answer))   not between 1 and 4000 then
    raise exception 'Flashcard question and answer are required.';
  end if;

  select * into v_card
  from public.flashcards
  where id = p_card_id and created_by = auth.uid() and type = 'user'
  for update;

  if not found then raise exception 'Flashcard was not found.'; end if;

  v_collection_id := coalesce(p_collection_id, v_card.collection_id);

  if not exists (
    select 1 from public.flashcard_collections
    where id = v_collection_id and user_id = auth.uid()
  ) then
    raise exception 'Flashcard collection was not found.';
  end if;

  update public.flashcards
  set collection_id = v_collection_id,
      question      = btrim(p_question),
      answer        = btrim(p_answer)
  where id = p_card_id
  returning * into v_card;

  return v_card;
end;
$$;

create or replace function public.delete_flashcard(p_card_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  if not exists (
    select 1 from public.flashcards
    where id = p_card_id and created_by = auth.uid() and type = 'user'
  ) then
    raise exception 'Flashcard was not found.';
  end if;

  if exists (select 1 from public.flashcard_reviews  where card_id = p_card_id)
  or exists (select 1 from public.flashcard_schedule where card_id = p_card_id) then
    raise exception 'Reviewed flashcards cannot be deleted.';
  end if;

  delete from public.flashcards where id = p_card_id;
end;
$$;

create or replace function public.review_flashcard(
  p_card_id uuid,
  p_rating  public.flashcard_review_rating
)
returns public.flashcard_reviews
language plpgsql security definer set search_path = public
as $$
declare
  v_review public.flashcard_reviews;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;

  if not exists (
    select 1 from public.flashcards f
    join public.flashcard_collections fc on fc.id = f.collection_id
    where f.id = p_card_id and f.type = 'user' and fc.user_id = auth.uid()
  ) then
    raise exception 'Flashcard was not found.';
  end if;

  insert into public.flashcard_reviews (card_id, user_id, rating)
  values (p_card_id, auth.uid(), p_rating)
  returning * into v_review;

  insert into public.flashcard_schedule (
    card_id, user_id, next_review, last_review, ease_factor, interval_days, repetitions
  ) values (
    p_card_id, auth.uid(), now() + interval '1 day', now(), 2.50, 1, 1
  )
  on conflict (card_id, user_id) do update set
    next_review   = now() + interval '1 day',
    last_review   = now(),
    ease_factor   = 2.50,
    interval_days = 1,
    repetitions   = flashcard_schedule.repetitions + 1;

  perform public.increment_daily_user_activity(auth.uid(), p_flashcards_reviewed => 1);
  perform public.award_module_xp('flashcard_reviewed');
  perform public.record_activity_event(
    'flashcard_reviewed', 'flashcard_reviews', v_review.id,
    jsonb_build_object('card_id', p_card_id, 'rating', p_rating),
    'private', 'flashcard_reviewed', 'Flashcard reviewed',
    'You reviewed a flashcard.', 'happy'
  );

  return v_review;
end;
$$;

-- ─── GRANTS ───────────────────────────────────────────────────

revoke all on function
  public.increment_daily_user_activity(uuid, date, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer),
  public.record_activity_event(public.activity_event_type, text, uuid, jsonb, public.activity_event_visibility, text, text, text, public.mascot_emotion, public.mascot_priority),
  public.award_module_xp(text, date),
  public.refresh_pyq_stats(uuid),
  public.refresh_vocabulary_stats(uuid),
  public.refresh_grammar_stats(uuid)
from public;

grant execute on function
  public.start_pyq_attempt(text, text, integer, text),
  public.finish_pyq_attempt(uuid, jsonb),
  public.log_water(integer),
  public.mark_word_learned(text),
  public.finish_grammar_quiz(text, integer, integer, numeric, text),
  public.create_flashcard_collection(text, text),
  public.create_flashcard(uuid, text, text),
  public.update_flashcard(uuid, text, text, uuid),
  public.delete_flashcard(uuid),
  public.review_flashcard(uuid, public.flashcard_review_rating)
to authenticated;
