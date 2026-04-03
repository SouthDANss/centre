create extension if not exists pgcrypto;

drop table if exists public.module_progress cascade;
drop table if exists public.applications cascade;
drop table if exists public.modules cascade;
drop table if exists public.programs cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin','student')),
  full_name text not null default '',
  surname text not null default '',
  reg_number text not null default '',
  email text,
  created_at timestamptz not null default now()
);

create table public.programs (
  id text primary key,
  title text not null,
  program_type text not null,
  start_date text not null,
  rating numeric(3,2) not null default 0
);

create table public.modules (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  module_order int not null,
  code text not null,
  title text not null,
  description text not null,
  video_url text default ''
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id text not null references public.programs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, program_id)
);

create table public.module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id text not null references public.programs(id) on delete cascade,
  module_id text not null references public.modules(id) on delete cascade,
  watched boolean not null default false,
  watched_once boolean not null default false,
  passed boolean not null default false,
  score int,
  created_at timestamptz not null default now(),
  unique(user_id, program_id, module_id)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, full_name, surname, reg_number, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'surname', ''),
    coalesce(new.raw_user_meta_data ->> 'reg_number', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.modules enable row level security;
alter table public.applications enable row level security;
alter table public.module_progress enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles for select using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own_or_admin" on public.profiles for update using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "programs_read_all" on public.programs for select using (true);
create policy "modules_read_all" on public.modules for select using (true);
create policy "applications_select_own_or_admin" on public.applications for select using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "applications_insert_own" on public.applications for insert with check (auth.uid() = user_id);
create policy "applications_update_admin" on public.applications for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "progress_select_own_or_admin" on public.module_progress for select using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "progress_insert_own" on public.module_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own_or_admin" on public.module_progress for update using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into public.programs (id, title, program_type, start_date, rating) values
('prog-1', 'Бухгалтерський облік і фінансова звітність у державних установах', 'Спеціально короткострокова програма', '07 Квітня 2026', 4.90),
('prog-2', 'Українська мова в службовій практиці', 'Загально короткострокова програма', '08 Квітня 2026', 4.92),
('prog-3', 'Використання табличного процесора Microsoft Excel в роботі державних службовців', 'Спеціально короткострокова програма', '08 Квітня 2026', 4.80),
('prog-4', 'Стратегічне державне планування та розвиток середньострокового бюджетного планування', 'Загально короткострокова програма', '20 Квітня 2026', 5.00);

insert into public.modules (id, program_id, module_order, code, title, description, video_url) values
('prog-1-mod-1','prog-1',1,'1.1','Бухгалтерський облік — модуль 1','Вступний модуль.',''),
('prog-1-mod-2','prog-1',2,'1.2','Бухгалтерський облік — модуль 2','Практичний модуль.',''),
('prog-2-mod-1','prog-2',1,'1.1','Українська мова — модуль 1','Вступний модуль.',''),
('prog-2-mod-2','prog-2',2,'1.2','Українська мова — модуль 2','Практичний модуль.',''),
('prog-3-mod-1','prog-3',1,'1.1','Excel — модуль 1','Вступний модуль.',''),
('prog-3-mod-2','prog-3',2,'1.2','Excel — модуль 2','Практичний модуль.',''),
('prog-4-mod-1','prog-4',1,'1.1','Планування — модуль 1','Вступний модуль.',''),
('prog-4-mod-2','prog-4',2,'1.2','Планування — модуль 2','Практичний модуль.','');
