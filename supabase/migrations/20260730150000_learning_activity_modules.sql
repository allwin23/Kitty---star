create type public.flashcard_type as enum ('builtin', 'user');
create type public.flashcard_review_rating as enum ('again', 'hard', 'good', 'easy');
create type public.activity_event_visibility as enum ('private', 'partner', 'public');
create type public.activity_event_type as enum (
  'planner_created', 'planner_updated', 'task_completed', 'pomodoro_started', 'pomodoro_completed',
  'pyq_started', 'pyq_completed', 'grammar_completed', 'vocabulary_learned', 'flashcard_created',
  'flashcard_reviewed', 'water_logged', 'submission_sent', 'submission_approved',
  'submission_rejected', 'achievement_unlocked', 'level_up', 'streak_increased',
  'daily_goal_completed', 'partner_connected'
);
create type public.mascot_emotion as enum ('happy', 'celebrate', 'encourage', 'remind', 'concerned');
create type public.mascot_priority as enum ('low', 'normal', 'high', 'critical');

create table public.pyq_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_name text not null check (char_length(btrim(set_name)) between 1 and 160),
  subject text not null check (char_length(btrim(subject)) between 1 and 120),
  year integer not null check (year between 1900 and 2100),
  mode text not null check (char_length(btrim(mode)) between 1 and 40),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(7, 2) not null default 0 check (score >= 0),
  correct integer not null default 0 check (correct >= 0),
  wrong integer not null default 0 check (wrong >= 0),
  unanswered integer not null default 0 check (unanswered >= 0),
  accuracy numeric(5, 2) not null default 0 check (accuracy between 0 and 100),
  time_taken_seconds integer not null default 0 check (time_taken_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pyq_attempts_answer_totals_check check (correct + wrong + unanswered >= 0),
  constraint pyq_attempts_submission_time_check check (submitted_at is null or submitted_at >= started_at)
);

create table public.pyq_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.pyq_attempts (id) on delete cascade,
  question_id text not null check (char_length(btrim(question_id)) between 1 and 160),
  selected_option text check (char_length(btrim(selected_option)) between 1 and 160),
  correct boolean not null,
  time_taken_seconds integer not null default 0 check (time_taken_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table public.pyq_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  total_tests integer not null default 0 check (total_tests >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  accuracy numeric(5, 2) not null default 0 check (accuracy between 0 and 100),
  best_score numeric(7, 2) not null default 0 check (best_score >= 0),
  today_tests integer not null default 0 check (today_tests >= 0),
  today_questions integer not null default 0 check (today_questions >= 0),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_ml integer not null check (amount_ml between 1 and 10000),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.water_daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  total_ml integer not null default 0 check (total_ml >= 0),
  goal_ml integer not null default 2000 check (goal_ml between 1 and 20000),
  goal_completed boolean not null default false,
  current_streak integer not null default 0 check (current_streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date),
  constraint water_daily_stats_goal_check check (goal_completed = (total_ml >= goal_ml))
);

create table public.vocabulary_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  word_id text not null check (char_length(btrim(word_id)) between 1 and 160),
  learned boolean not null default false,
  learned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, word_id),
  constraint vocabulary_progress_learned_at_check check ((learned and learned_at is not null) or (not learned and learned_at is null))
);

create table public.vocabulary_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  today_words integer not null default 0 check (today_words >= 0),
  total_words integer not null default 0 check (total_words >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grammar_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_name text not null check (char_length(btrim(set_name)) between 1 and 160),
  topic text not null check (char_length(btrim(topic)) between 1 and 160),
  correct integer not null default 0 check (correct >= 0),
  wrong integer not null default 0 check (wrong >= 0),
  score numeric(7, 2) not null default 0 check (score >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grammar_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  today_questions integer not null default 0 check (today_questions >= 0),
  today_correct integer not null default 0 check (today_correct >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  accuracy numeric(5, 2) not null default 0 check (accuracy between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_stats_today_correct_check check (today_correct <= today_questions)
);

create table public.flashcard_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.flashcard_collections (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete cascade,
  type public.flashcard_type not null default 'user',
  question text not null check (char_length(btrim(question)) between 1 and 4000),
  answer text not null check (char_length(btrim(answer)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.flashcards (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  rating public.flashcard_review_rating not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flashcard_schedule (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.flashcards (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  next_review timestamptz,
  last_review timestamptz,
  ease_factor numeric(4, 2) not null default 2.50 check (ease_factor >= 1),
  interval_days integer not null default 0 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id, user_id),
  constraint flashcard_schedule_review_order_check check (next_review is null or last_review is null or next_review >= last_review)
);

create table public.daily_user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  study_minutes integer not null default 0 check (study_minutes >= 0),
  pomodoros_completed integer not null default 0 check (pomodoros_completed >= 0),
  planned_tasks integer not null default 0 check (planned_tasks >= 0),
  completed_tasks integer not null default 0 check (completed_tasks >= 0 and completed_tasks <= planned_tasks),
  water_ml integer not null default 0 check (water_ml >= 0),
  pyq_tests integer not null default 0 check (pyq_tests >= 0),
  pyq_questions integer not null default 0 check (pyq_questions >= 0),
  grammar_questions integer not null default 0 check (grammar_questions >= 0),
  grammar_correct integer not null default 0 check (grammar_correct >= 0 and grammar_correct <= grammar_questions),
  vocabulary_words integer not null default 0 check (vocabulary_words >= 0),
  flashcards_reviewed integer not null default 0 check (flashcards_reviewed >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  achievements_unlocked integer not null default 0 check (achievements_unlocked >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type public.activity_event_type not null,
  reference_table text check (reference_table is null or reference_table ~ '^[a-z][a-z0-9_]{0,62}$'),
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  visibility public.activity_event_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_events_reference_check check ((reference_table is null) = (reference_id is null))
);

create table public.mascot_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.activity_events (id) on delete restrict,
  message_type text not null check (char_length(btrim(message_type)) between 1 and 64),
  title text not null check (char_length(btrim(title)) between 1 and 140),
  subtitle text check (char_length(subtitle) <= 500),
  icon text check (char_length(icon) between 1 and 120),
  emotion public.mascot_emotion not null,
  priority public.mascot_priority not null default 'normal',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pyq_attempts_user_created_idx on public.pyq_attempts (user_id, created_at desc);
create index pyq_attempts_user_lookup_idx on public.pyq_attempts (user_id, subject, year, set_name);
create index pyq_attempt_answers_attempt_idx on public.pyq_attempt_answers (attempt_id);
create index water_logs_user_logged_idx on public.water_logs (user_id, logged_at desc);
create index water_daily_stats_user_date_idx on public.water_daily_stats (user_id, date desc);
create index vocabulary_progress_user_learned_idx on public.vocabulary_progress (user_id, learned, learned_at desc);
create index grammar_attempts_user_completed_idx on public.grammar_attempts (user_id, completed_at desc);
create index grammar_attempts_user_topic_idx on public.grammar_attempts (user_id, topic, set_name);
create index flashcard_collections_user_created_idx on public.flashcard_collections (user_id, created_at desc);
create index flashcards_collection_created_idx on public.flashcards (collection_id, created_at desc);
create index flashcards_created_by_idx on public.flashcards (created_by);
create index flashcard_reviews_user_reviewed_idx on public.flashcard_reviews (user_id, reviewed_at desc);
create index flashcard_reviews_card_idx on public.flashcard_reviews (card_id);
create index flashcard_schedule_user_next_review_idx on public.flashcard_schedule (user_id, next_review);
create index daily_user_activity_user_date_idx on public.daily_user_activity (user_id, date desc);
create index daily_user_activity_date_idx on public.daily_user_activity (date desc);
create index activity_events_user_created_idx on public.activity_events (user_id, created_at desc);
create index activity_events_visibility_created_idx on public.activity_events (visibility, created_at desc);
create index activity_events_reference_idx on public.activity_events (reference_table, reference_id);
create index mascot_feed_user_read_created_idx on public.mascot_feed (user_id, is_read, created_at desc);
create index mascot_feed_event_idx on public.mascot_feed (event_id);

create or replace function public.guard_pyq_attempt_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.submitted_at is not null then
    raise exception 'Submitted PYQ attempts are immutable.';
  end if;
  return new;
end;
$$;

create or replace function public.guard_pyq_attempt_answer_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_attempt_id uuid;
begin
  v_attempt_id := case when tg_op = 'DELETE' then old.attempt_id else new.attempt_id end;
  if exists (select 1 from public.pyq_attempts where id = v_attempt_id and submitted_at is not null) then
    raise exception 'Answers for submitted PYQ attempts are immutable.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.guard_mascot_feed_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.user_id, new.event_id, new.message_type, new.title, new.subtitle, new.icon, new.emotion, new.priority, new.created_at) is distinct from
     (old.user_id, old.event_id, old.message_type, old.title, old.subtitle, old.icon, old.emotion, old.priority, old.created_at)
     or (old.is_read and not new.is_read) then
    raise exception 'Mascot feed entries may only be marked as read.';
  end if;
  return new;
end;
$$;

create or replace function public.ensure_learning_module_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pyq_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.vocabulary_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.grammar_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger pyq_attempts_set_updated_at before update on public.pyq_attempts for each row execute function public.set_updated_at();
create trigger pyq_attempt_answers_set_updated_at before update on public.pyq_attempt_answers for each row execute function public.set_updated_at();
create trigger pyq_stats_set_updated_at before update on public.pyq_stats for each row execute function public.set_updated_at();
create trigger water_logs_set_updated_at before update on public.water_logs for each row execute function public.set_updated_at();
create trigger water_daily_stats_set_updated_at before update on public.water_daily_stats for each row execute function public.set_updated_at();
create trigger vocabulary_progress_set_updated_at before update on public.vocabulary_progress for each row execute function public.set_updated_at();
create trigger vocabulary_stats_set_updated_at before update on public.vocabulary_stats for each row execute function public.set_updated_at();
create trigger grammar_attempts_set_updated_at before update on public.grammar_attempts for each row execute function public.set_updated_at();
create trigger grammar_stats_set_updated_at before update on public.grammar_stats for each row execute function public.set_updated_at();
create trigger flashcard_collections_set_updated_at before update on public.flashcard_collections for each row execute function public.set_updated_at();
create trigger flashcards_set_updated_at before update on public.flashcards for each row execute function public.set_updated_at();
create trigger flashcard_reviews_set_updated_at before update on public.flashcard_reviews for each row execute function public.set_updated_at();
create trigger flashcard_schedule_set_updated_at before update on public.flashcard_schedule for each row execute function public.set_updated_at();
create trigger daily_user_activity_set_updated_at before update on public.daily_user_activity for each row execute function public.set_updated_at();
create trigger activity_events_set_updated_at before update on public.activity_events for each row execute function public.set_updated_at();
create trigger mascot_feed_set_updated_at before update on public.mascot_feed for each row execute function public.set_updated_at();
create trigger pyq_attempts_guard_update before update on public.pyq_attempts for each row execute function public.guard_pyq_attempt_update();
create trigger pyq_attempt_answers_guard_write before insert or update or delete on public.pyq_attempt_answers for each row execute function public.guard_pyq_attempt_answer_write();
create trigger mascot_feed_guard_update before update on public.mascot_feed for each row execute function public.guard_mascot_feed_update();
create trigger profiles_ensure_learning_module_stats after insert on public.profiles for each row execute function public.ensure_learning_module_stats();

insert into public.pyq_stats (user_id) select id from public.profiles on conflict (user_id) do nothing;
insert into public.vocabulary_stats (user_id) select id from public.profiles on conflict (user_id) do nothing;
insert into public.grammar_stats (user_id) select id from public.profiles on conflict (user_id) do nothing;

alter table public.pyq_attempts enable row level security;
alter table public.pyq_attempt_answers enable row level security;
alter table public.pyq_stats enable row level security;
alter table public.water_logs enable row level security;
alter table public.water_daily_stats enable row level security;
alter table public.vocabulary_progress enable row level security;
alter table public.vocabulary_stats enable row level security;
alter table public.grammar_attempts enable row level security;
alter table public.grammar_stats enable row level security;
alter table public.flashcard_collections enable row level security;
alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.flashcard_schedule enable row level security;
alter table public.daily_user_activity enable row level security;
alter table public.activity_events enable row level security;
alter table public.mascot_feed enable row level security;

create policy "owners read PYQ attempts" on public.pyq_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "owners create PYQ attempts" on public.pyq_attempts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners update active PYQ attempts" on public.pyq_attempts for update to authenticated using (user_id = (select auth.uid()) and submitted_at is null) with check (user_id = (select auth.uid()));
create policy "owners read PYQ answers" on public.pyq_attempt_answers for select to authenticated using (exists (select 1 from public.pyq_attempts pa where pa.id = attempt_id and pa.user_id = (select auth.uid())));
create policy "owners manage active PYQ answers" on public.pyq_attempt_answers for insert to authenticated with check (exists (select 1 from public.pyq_attempts pa where pa.id = attempt_id and pa.user_id = (select auth.uid()) and pa.submitted_at is null));
create policy "owners update active PYQ answers" on public.pyq_attempt_answers for update to authenticated using (exists (select 1 from public.pyq_attempts pa where pa.id = attempt_id and pa.user_id = (select auth.uid()) and pa.submitted_at is null)) with check (exists (select 1 from public.pyq_attempts pa where pa.id = attempt_id and pa.user_id = (select auth.uid()) and pa.submitted_at is null));
create policy "owners read PYQ stats" on public.pyq_stats for select to authenticated using (user_id = (select auth.uid()));
create policy "owners read water logs" on public.water_logs for select to authenticated using (user_id = (select auth.uid()));
create policy "owners create water logs" on public.water_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners update water logs" on public.water_logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owners read water daily stats" on public.water_daily_stats for select to authenticated using (user_id = (select auth.uid()));
create policy "owners manage vocabulary progress" on public.vocabulary_progress for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owners read vocabulary stats" on public.vocabulary_stats for select to authenticated using (user_id = (select auth.uid()));
create policy "owners read grammar attempts" on public.grammar_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "owners create grammar attempts" on public.grammar_attempts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners read grammar stats" on public.grammar_stats for select to authenticated using (user_id = (select auth.uid()));
create policy "owners read flashcard collections" on public.flashcard_collections for select to authenticated using (user_id = (select auth.uid()));
create policy "owners create flashcard collections" on public.flashcard_collections for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners update flashcard collections" on public.flashcard_collections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owners read user flashcards" on public.flashcards for select to authenticated using (exists (select 1 from public.flashcard_collections fc where fc.id = collection_id and fc.user_id = (select auth.uid())));
create policy "owners create user flashcards" on public.flashcards for insert to authenticated with check (created_by = (select auth.uid()) and type = 'user' and exists (select 1 from public.flashcard_collections fc where fc.id = collection_id and fc.user_id = (select auth.uid())));
create policy "owners update user flashcards" on public.flashcards for update to authenticated using (created_by = (select auth.uid()) and exists (select 1 from public.flashcard_collections fc where fc.id = collection_id and fc.user_id = (select auth.uid()))) with check (created_by = (select auth.uid()) and type = 'user' and exists (select 1 from public.flashcard_collections fc where fc.id = collection_id and fc.user_id = (select auth.uid())));
create policy "owners read flashcard reviews" on public.flashcard_reviews for select to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.flashcards f join public.flashcard_collections fc on fc.id = f.collection_id where f.id = card_id and fc.user_id = (select auth.uid())));
create policy "owners create flashcard reviews" on public.flashcard_reviews for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.flashcards f join public.flashcard_collections fc on fc.id = f.collection_id where f.id = card_id and fc.user_id = (select auth.uid())));
create policy "owners read flashcard schedules" on public.flashcard_schedule for select to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.flashcards f join public.flashcard_collections fc on fc.id = f.collection_id where f.id = card_id and fc.user_id = (select auth.uid())));
create policy "owners manage flashcard schedules" on public.flashcard_schedule for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.flashcards f join public.flashcard_collections fc on fc.id = f.collection_id where f.id = card_id and fc.user_id = (select auth.uid())));
create policy "owners update flashcard schedules" on public.flashcard_schedule for update to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.flashcards f join public.flashcard_collections fc on fc.id = f.collection_id where f.id = card_id and fc.user_id = (select auth.uid()))) with check (user_id = (select auth.uid()) and exists (select 1 from public.flashcards f join public.flashcard_collections fc on fc.id = f.collection_id where f.id = card_id and fc.user_id = (select auth.uid())));
create policy "owners read daily activity" on public.daily_user_activity for select to authenticated using (user_id = (select auth.uid()));
create policy "activity events follow visibility" on public.activity_events for select to authenticated using (user_id = (select auth.uid()) or (visibility = 'partner' and public.is_partner_of(user_id)) or visibility = 'public');
create policy "owners create activity events" on public.activity_events for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners read mascot feed" on public.mascot_feed for select to authenticated using (user_id = (select auth.uid()));
create policy "owners mark mascot feed read" on public.mascot_feed for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
