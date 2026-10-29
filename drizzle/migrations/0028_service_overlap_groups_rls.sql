create table if not exists public.service_overlap_groups (
  group_key text not null,
  category_name text not null,
  primary key (group_key, category_name)
);
alter table public.service_overlap_groups enable row level security;