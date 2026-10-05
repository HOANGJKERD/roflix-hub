-- Realtime publication for per-user security state. RLS still controls who can receive rows.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
