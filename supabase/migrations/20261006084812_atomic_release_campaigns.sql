-- Invoker function: only the backend role can replace a campaign, under one transaction.
create function public.save_release_campaign(p_month date,p_movies jsonb,p_finalize boolean,p_subject text,p_preview text)
returns jsonb language plpgsql set search_path=pg_catalog as $$
declare campaign public.monthly_watchlists; item jsonb; begin
 if extract(day from p_month)<>1 or jsonb_typeof(p_movies)<>'array' or jsonb_array_length(p_movies) not between 1 and 10 then raise exception 'Invalid campaign payload';end if;
 perform pg_advisory_xact_lock(hashtextextended('monthly-release:'||p_month::text,0));
 select * into campaign from public.monthly_watchlists where month_key=p_month for update;
 if campaign.status in ('sending','sent') then raise exception 'Campaign is locked for delivery';end if;
 insert into public.monthly_watchlists(month_key,month,year,status,subject,preview_text,generated_at,finalized_at)
 values(p_month,extract(month from p_month),extract(year from p_month),case when p_finalize then 'ready' else 'draft' end,p_subject,p_preview,now(),case when p_finalize then now() else null end)
 on conflict(month_key) do update set status=excluded.status,subject=excluded.subject,preview_text=excluded.preview_text,generated_at=excluded.generated_at,finalized_at=excluded.finalized_at,error_message=null
 returning * into campaign;
 delete from public.monthly_watchlist_movies where watchlist_id=campaign.id;
 for item in select value from jsonb_array_elements(p_movies) loop
   if (item->>'releaseDate')::date<p_month or (item->>'releaseDate')::date>=p_month+interval '1 month' then raise exception 'Release is outside campaign month';end if;
   insert into public.monthly_watchlist_movies(watchlist_id,movie_id,movie_title,poster_path,category,release_date,provider,availability_type,ranking_score,display_order,source_url,verified_at,metadata)
   values(campaign.id,item->>'movieId',item->>'movieTitle',item->>'posterPath',item->>'category',(item->>'releaseDate')::date,item->>'provider',item->>'availabilityType',(item->>'rankingScore')::numeric,(item->>'displayOrder')::integer,item->>'sourceUrl',(item->>'verifiedAt')::timestamptz,
   jsonb_build_object('eventId',item->>'eventId','confidence',item->>'confidence','sourceName',item->>'sourceName'));
 end loop;
 if p_finalize and (select count(distinct category) from public.monthly_watchlist_movies where watchlist_id=campaign.id)<>2 then raise exception 'Both release sections require trustworthy picks';end if;
 return to_jsonb(campaign);
end $$;
revoke execute on function public.save_release_campaign(date,jsonb,boolean,text,text) from public,anon,authenticated;
grant execute on function public.save_release_campaign(date,jsonb,boolean,text,text) to service_role;
