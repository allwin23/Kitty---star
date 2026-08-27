-- Create focus lock categories table
create table public.categories (
    id text primary key,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create focus lock sites table
create table public.sites (
    id uuid primary key default gen_random_uuid(),
    category_id text references public.categories(id) on delete cascade not null,
    domain text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create focus lock profiles table
create table public.focus_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    strict_mode boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create focus lock profile categories junction table
create table public.focus_profile_categories (
    profile_id uuid references public.focus_profiles(id) on delete cascade not null,
    category_id text references public.categories(id) on delete cascade not null,
    primary key (profile_id, category_id)
);

-- Create focus lock profile custom sites table
create table public.focus_profile_custom_sites (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references public.focus_profiles(id) on delete cascade not null,
    domain text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (profile_id, domain)
);

-- Create focus sessions table
create table public.focus_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    profile_id uuid references public.focus_profiles(id) on delete set null,
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    ends_at timestamp with time zone not null,
    status text not null check (status in ('idle', 'starting', 'active', 'completed', 'cancelled')) default 'starting',
    strict_mode boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create focus session categories junction table
create table public.focus_session_categories (
    session_id uuid references public.focus_sessions(id) on delete cascade not null,
    category_id text references public.categories(id) on delete cascade not null,
    primary key (session_id, category_id)
);

-- Create focus session custom sites table
create table public.focus_session_custom_sites (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references public.focus_sessions(id) on delete cascade not null,
    domain text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (session_id, domain)
);

-- Create user settings table
create table public.user_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    is_blocker_enabled boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on all tables
alter table public.categories enable row level security;
alter table public.sites enable row level security;
alter table public.focus_profiles enable row level security;
alter table public.focus_profile_categories enable row level security;
alter table public.focus_profile_custom_sites enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.focus_session_categories enable row level security;
alter table public.focus_session_custom_sites enable row level security;
alter table public.user_settings enable row level security;

-- Define RLS policies
-- Categories / Sites (Read-only for users)
create policy "Anyone can read categories" on public.categories for select using (true);
create policy "Anyone can read sites" on public.sites for select using (true);

-- Focus Profiles
create policy "Users can perform all actions on own focus profiles"
    on public.focus_profiles for all using (auth.uid() = user_id);

-- Profile Categories
create policy "Users can perform all actions on own profile categories"
    on public.focus_profile_categories for all
    using (exists (
        select 1 from public.focus_profiles
        where id = profile_id and user_id = auth.uid()
    ));

-- Profile Custom Sites
create policy "Users can perform all actions on own profile custom sites"
    on public.focus_profile_custom_sites for all
    using (exists (
        select 1 from public.focus_profiles
        where id = profile_id and user_id = auth.uid()
    ));

-- Focus Sessions
create policy "Users can perform all actions on own focus sessions"
    on public.focus_sessions for all using (auth.uid() = user_id);

-- Focus Session Categories
create policy "Users can perform all actions on own focus session categories"
    on public.focus_session_categories for all
    using (exists (
        select 1 from public.focus_sessions
        where id = session_id and user_id = auth.uid()
    ));

-- Focus Session Custom Sites
create policy "Users can perform all actions on own focus session custom sites"
    on public.focus_session_custom_sites for all
    using (exists (
        select 1 from public.focus_sessions
        where id = session_id and user_id = auth.uid()
    ));

-- User Settings
create policy "Users can perform all actions on own settings"
    on public.user_settings for all using (auth.uid() = user_id);

-- Add useful indexes for queries
create index idx_focus_profiles_user_id on public.focus_profiles(user_id);
create index idx_focus_sessions_user_id on public.focus_sessions(user_id);
create index idx_focus_sessions_status on public.focus_sessions(status);
create index idx_sites_category_id on public.sites(category_id);

-- Add tables to realtime publication
alter publication supabase_realtime add table public.focus_sessions;
alter publication supabase_realtime add table public.focus_session_categories;
alter publication supabase_realtime add table public.focus_session_custom_sites;

-- Insert seed data for categories
insert into public.categories (id, name) values
    ('social', 'Social Media'),
    ('video', 'Video & Streaming'),
    ('gaming', 'Gaming'),
    ('shopping', 'Shopping'),
    ('news', 'News')
on conflict (id) do nothing;

-- Insert seed data for default blocked sites
insert into public.sites (category_id, domain) values
    -- Social
    ('social', 'facebook.com'),
    ('social', 'twitter.com'),
    ('social', 'instagram.com'),
    ('social', 'tiktok.com'),
    ('social', 'reddit.com'),
    ('social', 'linkedin.com'),
    -- Video
    ('video', 'youtube.com'),
    ('video', 'netflix.com'),
    ('video', 'twitch.tv'),
    ('video', 'vimeo.com'),
    ('video', 'hulu.com'),
    ('video', 'disneyplus.com'),
    -- Gaming
    ('gaming', 'roblox.com'),
    ('gaming', 'minecraft.net'),
    ('gaming', 'steamcommunity.com'),
    ('gaming', 'discord.com'),
    ('gaming', 'epicgames.com'),
    -- Shopping
    ('shopping', 'amazon.com'),
    ('shopping', 'ebay.com'),
    ('shopping', 'aliexpress.com'),
    ('shopping', 'walmart.com'),
    ('shopping', 'target.com'),
    -- News
    ('news', 'nytimes.com'),
    ('news', 'cnn.com'),
    ('news', 'bbc.co.uk'),
    ('news', 'reuters.com'),
    ('news', 'bloomberg.com')
on conflict (domain) do nothing;
