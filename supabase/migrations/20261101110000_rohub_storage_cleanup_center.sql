create or replace function public.rohub_storage_cleanup_scan(p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=public,storage,pg_temp as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not public.roflix_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 with raw_refs as (
  select regexp_replace(x->>'url','^.*?/storage/v1/object/(public|sign)/rotruyen-pages/','','i') object_name
  from public.rotruyen_chapters c cross join lateral jsonb_array_elements(case when jsonb_typeof(c.page_manifest)='array' then c.page_manifest else '[]'::jsonb end) x
  where x ? 'url' and x->>'url' like '%/storage/v1/object/%/rotruyen-pages/%'
  union all
  select regexp_replace(s.cover_url,'^.*?/storage/v1/object/(public|sign)/rotruyen-pages/','','i') from public.rotruyen_series s where s.cover_url like '%/storage/v1/object/%/rotruyen-pages/%'
 ), refs as (select object_name,count(*)::integer ref_count from raw_refs group by object_name),
 objects as (select o.id,o.name,o.metadata,o.created_at,coalesce(r.ref_count,0) ref_count,nullif(trim(both '"' from coalesce(o.metadata->>'eTag',o.metadata->>'etag','')),'') etag,coalesce((o.metadata->>'size')::bigint,0) size_bytes from storage.objects o left join refs r on r.object_name=o.name where o.bucket_id='rotruyen-pages'),
 classified as (select *,count(*) over(partition by coalesce(etag,id::text),size_bytes) duplicate_count from objects),
 selected as (select *,case when ref_count=0 then 'orphan' when duplicate_count>1 then 'duplicate' else 'referenced' end cleanup_status from classified),
 totals as (select count(*)::bigint total_objects,coalesce(sum(size_bytes),0)::bigint total_bytes,count(*) filter(where ref_count=0)::bigint orphan_objects,coalesce(sum(size_bytes) filter(where ref_count=0),0)::bigint orphan_bytes,count(*) filter(where duplicate_count>1)::bigint duplicate_objects from selected),
 duplicate_savings as (select coalesce(sum(group_bytes-largest_copy),0)::bigint duplicate_reclaimable_bytes from (select sum(size_bytes) group_bytes,max(size_bytes) largest_copy from objects where etag is not null group by etag,size_bytes having count(*)>1) d)
 select jsonb_build_object('summary',(select to_jsonb(totals)||to_jsonb(duplicate_savings) from totals cross join duplicate_savings),'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'size_bytes',size_bytes,'mimetype',metadata->>'mimetype','etag',etag,'created_at',created_at,'reference_count',ref_count,'duplicate_count',duplicate_count,'status',cleanup_status) order by case cleanup_status when 'orphan' then 0 when 'duplicate' then 1 else 2 end,size_bytes desc) from (select * from selected order by case cleanup_status when 'orphan' then 0 when 'duplicate' then 1 else 2 end,size_bytes desc limit greatest(1,least(p_limit,200)) offset greatest(0,p_offset)) page),'[]'::jsonb)) into v_result;
 return v_result;
end $$;
revoke all on function public.rohub_storage_cleanup_scan(integer,integer) from public,anon;
grant execute on function public.rohub_storage_cleanup_scan(integer,integer) to authenticated;
