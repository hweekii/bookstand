-- ─────────────────────────────────────────────
-- THE READING GAZETTE — Supabase Schema
-- Paste this entire file into Supabase SQL Editor and click Run
-- ─────────────────────────────────────────────

-- PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

-- BOOKS
create table public.books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  author text,
  genre text,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  month text not null,
  year text not null,
  is_headline boolean default false,
  created_at timestamptz default now()
);

-- FOLLOWS
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- REACTIONS (emoji)
create table public.reactions (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique (book_id, user_id, emoji)
);

-- COMMENTS
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- BOOKMARKS ("want to read")
create table public.bookmarks (
  user_id uuid references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, book_id)
);

-- ─── ROW LEVEL SECURITY ───────────────────────

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.bookmarks enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Books: anyone can read, only owner can insert/update/delete
create policy "books_select" on public.books for select using (true);
create policy "books_insert" on public.books for insert with check (auth.uid() = user_id);
create policy "books_update" on public.books for update using (auth.uid() = user_id);
create policy "books_delete" on public.books for delete using (auth.uid() = user_id);

-- Follows: anyone can read, auth users manage their own
create policy "follows_select" on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

-- Reactions: anyone can read, auth users manage their own
create policy "reactions_select" on public.reactions for select using (true);
create policy "reactions_insert" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions_delete" on public.reactions for delete using (auth.uid() = user_id);

-- Comments: anyone can read, auth users insert their own, owner can delete
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on public.comments for delete using (auth.uid() = user_id);

-- Bookmarks: only owner can read and manage
create policy "bookmarks_select" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks for delete using (auth.uid() = user_id);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();