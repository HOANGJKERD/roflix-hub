do $$ begin
  alter publication supabase_realtime add table public.rotruyen_series;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.rotruyen_chapters;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.rotruyen_user_library;
exception when duplicate_object then null;
when undefined_object then null;
end $$;