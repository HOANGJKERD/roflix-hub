-- RoHub Supabase schema snapshot
-- Source: Seoul project rbbudoccewyvmbkpdfju
-- Captured: 2026-11-06
-- Purpose: reproducible schema baseline for a clean Supabase project.
-- IMPORTANT: This is a snapshot, not an incremental migration. Apply only to a clean project.
-- Auth users, Storage objects, project secrets, Auth provider settings and Edge Function secrets are not included.

begin;

-- 1. Public tables and non-FK constraints
CREATE TABLE public.community_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT community_comments_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000))),
  CONSTRAINT community_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.community_likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT community_likes_pkey PRIMARY KEY (post_id, user_id)
);

CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_title text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  body text NOT NULL,
  display_name text NOT NULL DEFAULT 'RoFlix user'::text,
  status text NOT NULL DEFAULT 'visible'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 3000))),
  CONSTRAINT community_posts_display_name_check CHECK ((char_length(display_name) <= 40)),
  CONSTRAINT community_posts_movie_title_check CHECK (((char_length(movie_title) >= 1) AND (char_length(movie_title) <= 160))),
  CONSTRAINT community_posts_pkey PRIMARY KEY (id),
  CONSTRAINT community_posts_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT community_posts_status_check CHECK ((status = ANY (ARRAY['visible'::text, 'hidden'::text])))
);

CREATE TABLE public.movie_comments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  movie_slug text NOT NULL,
  movie_title text NOT NULL DEFAULT ''::text,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT 'RoFlix user'::text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT movie_comments_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000))),
  CONSTRAINT movie_comments_pkey PRIMARY KEY (id),
  CONSTRAINT movie_comments_status_check CHECK ((status = ANY (ARRAY['visible'::text, 'hidden'::text])))
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT ''::text,
  post_id uuid,
  comment_id uuid,
  room_id uuid,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_body_check CHECK ((char_length(body) <= 1000)),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 160))),
  CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['like'::text, 'comment'::text, 'reply'::text, 'party_invite'::text, 'party_event'::text, 'system'::text])))
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  account_status text NOT NULL DEFAULT 'active'::text,
  last_seen_at timestamp with time zone,
  bio text DEFAULT ''::text,
  avatar_url text DEFAULT ''::text,
  banner_url text DEFAULT ''::text,
  country text DEFAULT 'Việt Nam'::text,
  profile_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  suspended_until timestamp with time zone,
  security_version bigint NOT NULL DEFAULT 1,
  admin_note text NOT NULL DEFAULT ''::text,
  CONSTRAINT profiles_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'banned'::text]))),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);

CREATE TABLE public.roflix_active_sessions (
  session_id text NOT NULL,
  user_id uuid,
  page text,
  movie_slug text,
  movie_title text,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  device_label text,
  revoked_at timestamp with time zone,
  revoke_reason text NOT NULL DEFAULT ''::text,
  CONSTRAINT roflix_active_sessions_pkey PRIMARY KEY (session_id)
);

CREATE TABLE public.roflix_admin_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  admin_id uuid,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_admin_audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roflix_admin_control_events (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  event_type text NOT NULL,
  target_user_id uuid,
  target_session_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_admin_control_events_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roflix_admin_feature_flags (
  key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_admin_feature_flags_pkey PRIMARY KEY (key)
);

CREATE TABLE public.roflix_custom_movies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  origin_name text NOT NULL DEFAULT ''::text,
  summary text NOT NULL DEFAULT ''::text,
  poster_url text NOT NULL DEFAULT ''::text,
  backdrop_url text NOT NULL DEFAULT ''::text,
  actors jsonb NOT NULL DEFAULT '[]'::jsonb,
  directors jsonb NOT NULL DEFAULT '[]'::jsonb,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  year integer,
  quality text NOT NULL DEFAULT 'HD'::text,
  lang text NOT NULL DEFAULT 'Vietsub'::text,
  trailer_url text NOT NULL DEFAULT ''::text,
  video_path text NOT NULL,
  video_mime text NOT NULL DEFAULT 'video/mp4'::text,
  locked boolean NOT NULL DEFAULT false,
  lock_reason text NOT NULL DEFAULT ''::text,
  published boolean NOT NULL DEFAULT true,
  admin_note text NOT NULL DEFAULT ''::text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  drive_file_id text,
  drive_share_url text,
  playback_mode text NOT NULL DEFAULT 'storage'::text,
  source_provider text NOT NULL DEFAULT 'storage'::text,
  drive_permission_status text NOT NULL DEFAULT 'unchecked'::text,
  drive_checked_at timestamp with time zone,
  CONSTRAINT roflix_custom_movies_drive_permission_status_check CHECK ((drive_permission_status = ANY (ARRAY['unchecked'::text, 'public_link'::text, 'restricted'::text, 'invalid'::text]))),
  CONSTRAINT roflix_custom_movies_pkey PRIMARY KEY (id),
  CONSTRAINT roflix_custom_movies_playback_mode_check CHECK ((playback_mode = ANY (ARRAY['storage'::text, 'drive_preview'::text]))),
  CONSTRAINT roflix_custom_movies_slug_key UNIQUE (slug),
  CONSTRAINT roflix_custom_movies_source_provider_check CHECK ((source_provider = ANY (ARRAY['storage'::text, 'google_drive'::text])))
);

CREATE TABLE public.roflix_favorites_cloud (
  user_id uuid NOT NULL,
  movie_slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_favorites_cloud_pkey PRIMARY KEY (user_id, movie_slug)
);

CREATE TABLE public.roflix_game_stats (
  user_id uuid NOT NULL,
  level integer NOT NULL DEFAULT 1,
  exp bigint NOT NULL DEFAULT 0,
  gems bigint NOT NULL DEFAULT 0,
  gems_earned bigint NOT NULL DEFAULT 0,
  movies_watched bigint NOT NULL DEFAULT 0,
  episodes_watched bigint NOT NULL DEFAULT 0,
  comments_count bigint NOT NULL DEFAULT 0,
  favorites_count bigint NOT NULL DEFAULT 0,
  watch_minutes bigint NOT NULL DEFAULT 0,
  gacha_pulls bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_game_stats_comments_count_check CHECK ((comments_count >= 0)),
  CONSTRAINT roflix_game_stats_episodes_watched_check CHECK ((episodes_watched >= 0)),
  CONSTRAINT roflix_game_stats_exp_check CHECK ((exp >= 0)),
  CONSTRAINT roflix_game_stats_favorites_count_check CHECK ((favorites_count >= 0)),
  CONSTRAINT roflix_game_stats_gacha_pulls_check CHECK ((gacha_pulls >= 0)),
  CONSTRAINT roflix_game_stats_gems_check CHECK ((gems >= 0)),
  CONSTRAINT roflix_game_stats_gems_earned_check CHECK ((gems_earned >= 0)),
  CONSTRAINT roflix_game_stats_level_check CHECK ((level >= 1)),
  CONSTRAINT roflix_game_stats_movies_watched_check CHECK ((movies_watched >= 0)),
  CONSTRAINT roflix_game_stats_pkey PRIMARY KEY (user_id),
  CONSTRAINT roflix_game_stats_watch_minutes_check CHECK ((watch_minutes >= 0))
);

CREATE TABLE public.roflix_gem_transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  admin_id uuid,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  delta bigint NOT NULL DEFAULT 0,
  balance_before bigint NOT NULL DEFAULT 0,
  balance_after bigint NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_gem_transactions_action_check CHECK ((action = ANY (ARRAY['add'::text, 'remove'::text, 'set'::text]))),
  CONSTRAINT roflix_gem_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roflix_movie_comment_likes (
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_movie_comment_likes_pkey PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE public.roflix_movie_comment_moderation (
  comment_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'visible'::text,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_movie_comment_moderation_pkey PRIMARY KEY (comment_id),
  CONSTRAINT roflix_movie_comment_moderation_status_check CHECK ((status = ANY (ARRAY['visible'::text, 'hidden'::text])))
);

CREATE TABLE public.roflix_movie_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  movie_slug text NOT NULL,
  movie_title text,
  user_id uuid,
  username text NOT NULL DEFAULT 'Khán Giả'::text,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  parent_id uuid,
  display_name text,
  status text,
  CONSTRAINT roflix_movie_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roflix_movie_curation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  movie_slug text NOT NULL,
  movie_title text NOT NULL,
  origin_name text NOT NULL DEFAULT ''::text,
  poster_url text NOT NULL DEFAULT ''::text,
  year integer,
  type_key text NOT NULL DEFAULT 'phim-le'::text,
  list_keys text[] NOT NULL DEFAULT '{}'::text[],
  genre_keys text[] NOT NULL DEFAULT '{}'::text[],
  source_genres text[] NOT NULL DEFAULT '{}'::text[],
  quality text NOT NULL DEFAULT ''::text,
  lang text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT ''::text,
  auto_suggested boolean NOT NULL DEFAULT false,
  curated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_movie_curation_pkey PRIMARY KEY (id),
  CONSTRAINT roflix_movie_curation_source_id_check CHECK ((source_id = ANY (ARRAY['kkphim'::text, 'vsmov'::text, 'custom'::text]))),
  CONSTRAINT roflix_movie_curation_source_id_movie_slug_key UNIQUE (source_id, movie_slug)
);

CREATE TABLE public.roflix_movie_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  movie_slug text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  lock_reason text NOT NULL DEFAULT ''::text,
  title text,
  origin_name text,
  summary text,
  poster_url text,
  backdrop_url text,
  actors jsonb NOT NULL DEFAULT '[]'::jsonb,
  directors jsonb NOT NULL DEFAULT '[]'::jsonb,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  year integer,
  quality text,
  lang text,
  trailer_url text,
  preferred_source_id text,
  episodes jsonb,
  admin_note text NOT NULL DEFAULT ''::text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_movie_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT roflix_movie_overrides_preferred_source_id_check CHECK (((preferred_source_id IS NULL) OR (preferred_source_id = ANY (ARRAY['kkphim'::text, 'vsmov'::text])))),
  CONSTRAINT roflix_movie_overrides_source_id_check CHECK ((source_id = ANY (ARRAY['kkphim'::text, 'vsmov'::text]))),
  CONSTRAINT roflix_movie_overrides_source_id_movie_slug_key UNIQUE (source_id, movie_slug)
);

CREATE TABLE public.roflix_movie_settings (
  id boolean NOT NULL DEFAULT true,
  lock_18_plus boolean NOT NULL DEFAULT true,
  force_login_for_locked boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_movie_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roflix_release_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  movie_slug text NOT NULL,
  title text NOT NULL,
  origin_name text NOT NULL DEFAULT ''::text,
  source_id text NOT NULL DEFAULT 'kkphim'::text,
  poster_url text,
  summary text NOT NULL DEFAULT ''::text,
  note text NOT NULL DEFAULT ''::text,
  release_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'::text,
  featured boolean NOT NULL DEFAULT false,
  created_by uuid,
  released_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_release_schedule_pkey PRIMARY KEY (id),
  CONSTRAINT roflix_release_schedule_source_id_check CHECK ((source_id = ANY (ARRAY['kkphim'::text, 'vsmov'::text]))),
  CONSTRAINT roflix_release_schedule_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'released'::text, 'cancelled'::text])))
);

CREATE TABLE public.roflix_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  admin_note text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT roflix_reports_pkey PRIMARY KEY (id),
  CONSTRAINT roflix_reports_reason_check CHECK (((char_length(reason) >= 1) AND (char_length(reason) <= 500))),
  CONSTRAINT roflix_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text]))),
  CONSTRAINT roflix_reports_target_type_check CHECK ((target_type = ANY (ARRAY['post'::text, 'comment'::text, 'movie_comment'::text, 'user'::text, 'watch_party'::text])))
);

CREATE TABLE public.roflix_site_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  event_type text NOT NULL,
  session_id text NOT NULL,
  user_id uuid,
  page text,
  movie_slug text,
  movie_title text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_site_events_event_type_check CHECK ((event_type = ANY (ARRAY['page_view'::text, 'movie_view'::text, 'movie_play'::text, 'movie_detail'::text, 'search'::text, 'heartbeat'::text, 'login'::text, 'signup'::text, 'logout'::text]))),
  CONSTRAINT roflix_site_events_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roflix_sync_fingerprints (
  user_id uuid NOT NULL,
  kind text NOT NULL,
  fingerprint text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_sync_fingerprints_kind_check CHECK ((kind = ANY (ARRAY['gacha'::text, 'history'::text, 'profile'::text]))),
  CONSTRAINT roflix_sync_fingerprints_pkey PRIMARY KEY (user_id, kind)
);

CREATE TABLE public.roflix_tv_featured (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  movie_slug text NOT NULL,
  title text NOT NULL,
  poster_url text NOT NULL DEFAULT ''::text,
  backdrop_url text NOT NULL DEFAULT ''::text,
  rank integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_tv_featured_pkey PRIMARY KEY (id),
  CONSTRAINT roflix_tv_featured_source_id_check CHECK ((source_id = ANY (ARRAY['kkphim'::text, 'vsmov'::text]))),
  CONSTRAINT roflix_tv_featured_source_id_movie_slug_key UNIQUE (source_id, movie_slug)
);

CREATE TABLE public.roflix_tv_settings (
  id boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  default_source text NOT NULL DEFAULT 'auto'::text,
  refresh_minutes integer NOT NULL DEFAULT 15,
  max_items integer NOT NULL DEFAULT 12,
  autoplay boolean NOT NULL DEFAULT false,
  quality_mode text NOT NULL DEFAULT 'auto'::text,
  show_hero boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_tv_settings_default_source_check CHECK ((default_source = ANY (ARRAY['auto'::text, 'kkphim'::text, 'vsmov'::text]))),
  CONSTRAINT roflix_tv_settings_id_check CHECK ((id = true)),
  CONSTRAINT roflix_tv_settings_max_items_check CHECK (((max_items >= 6) AND (max_items <= 24))),
  CONSTRAINT roflix_tv_settings_pkey PRIMARY KEY (id),
  CONSTRAINT roflix_tv_settings_quality_mode_check CHECK ((quality_mode = ANY (ARRAY['auto'::text, '720p'::text, '1080p'::text, '4k'::text]))),
  CONSTRAINT roflix_tv_settings_refresh_minutes_check CHECK (((refresh_minutes >= 5) AND (refresh_minutes <= 120)))
);

CREATE TABLE public.roflix_watch_history (
  user_id uuid NOT NULL,
  slug text NOT NULL,
  title text,
  poster text,
  episode integer NOT NULL DEFAULT 0,
  episode_name text,
  progress numeric(6,5) NOT NULL DEFAULT 0,
  source_id text,
  genres jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_watch_history_pkey PRIMARY KEY (user_id, slug)
);

CREATE TABLE public.roflix_watch_metrics (
  session_id text NOT NULL,
  movie_slug text NOT NULL,
  movie_title text,
  user_id uuid,
  watched_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  completed boolean NOT NULL DEFAULT false,
  first_watched_at timestamp with time zone NOT NULL DEFAULT now(),
  last_watched_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_watch_metrics_pkey PRIMARY KEY (session_id, movie_slug),
  CONSTRAINT roflix_watch_metrics_watched_seconds_check CHECK ((watched_seconds >= 0))
);

CREATE TABLE public.roflix_watch_reward_claims (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  movie_slug text NOT NULL,
  claimed_minutes integer NOT NULL,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  claim_bucket timestamp with time zone,
  CONSTRAINT roflix_watch_reward_claims_claimed_minutes_check CHECK (((claimed_minutes > 0) AND (claimed_minutes <= 15))),
  CONSTRAINT roflix_watch_reward_claims_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roflix_watchlist (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  movie_slug text NOT NULL,
  movie_title text NOT NULL DEFAULT ''::text,
  origin_name text NOT NULL DEFAULT ''::text,
  poster_url text NOT NULL DEFAULT ''::text,
  source_id text NOT NULL DEFAULT 'kkphim'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roflix_watchlist_pkey PRIMARY KEY (id),
  CONSTRAINT roflix_watchlist_user_id_movie_slug_key UNIQUE (user_id, movie_slug)
);

CREATE TABLE public.rohub_published_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_app text NOT NULL,
  template_type text NOT NULL,
  template_id uuid NOT NULL,
  template_version integer NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_by uuid,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rohub_published_themes_pkey PRIMARY KEY (id),
  CONSTRAINT rohub_published_themes_target_app_check CHECK ((target_app = ANY (ARRAY['roflix'::text, 'rotruyen'::text]))),
  CONSTRAINT rohub_published_themes_target_app_template_type_key UNIQUE (target_app, template_type)
);

CREATE TABLE public.rohub_template_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  version integer NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  target_app text NOT NULL,
  template_type text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  config jsonb NOT NULL,
  status text NOT NULL,
  action text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rohub_template_revisions_action_check CHECK ((action = ANY (ARRAY['publish'::text, 'rollback'::text, 'snapshot'::text]))),
  CONSTRAINT rohub_template_revisions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.rohub_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  target_app text NOT NULL DEFAULT 'both'::text,
  template_type text NOT NULL DEFAULT 'page'::text,
  description text NOT NULL DEFAULT ''::text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'::text,
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone,
  CONSTRAINT rohub_templates_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))),
  CONSTRAINT rohub_templates_pkey PRIMARY KEY (id),
  CONSTRAINT rohub_templates_slug_check CHECK ((slug ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'::text)),
  CONSTRAINT rohub_templates_slug_key UNIQUE (slug),
  CONSTRAINT rohub_templates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
  CONSTRAINT rohub_templates_target_app_check CHECK ((target_app = ANY (ARRAY['roflix'::text, 'rotruyen'::text, 'both'::text]))),
  CONSTRAINT rohub_templates_template_type_check CHECK ((template_type = ANY (ARRAY['header'::text, 'footer'::text, 'homepage'::text, 'page'::text, 'series'::text, 'reader'::text, 'login'::text, 'register'::text, 'search'::text, 'category'::text, 'tag'::text, 'author'::text, '404'::text]))),
  CONSTRAINT rohub_templates_version_check CHECK ((version > 0))
);

CREATE TABLE public.rotruyen_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rotruyen_audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.rotruyen_chapters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL,
  chapter_number numeric(10,2) NOT NULL,
  title text NOT NULL DEFAULT ''::text,
  external_url text NOT NULL DEFAULT ''::text,
  page_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rotruyen_chapters_page_manifest_check CHECK ((jsonb_typeof(page_manifest) = 'array'::text)),
  CONSTRAINT rotruyen_chapters_pkey PRIMARY KEY (id),
  CONSTRAINT rotruyen_chapters_series_id_chapter_number_key UNIQUE (series_id, chapter_number)
);

CREATE TABLE public.rotruyen_genres (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rotruyen_genres_name_key UNIQUE (name),
  CONSTRAINT rotruyen_genres_pkey PRIMARY KEY (id),
  CONSTRAINT rotruyen_genres_slug_key UNIQUE (slug)
);

CREATE TABLE public.rotruyen_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  synopsis text NOT NULL DEFAULT ''::text,
  cover_url text NOT NULL DEFAULT ''::text,
  author text NOT NULL DEFAULT ''::text,
  source_key text NOT NULL DEFAULT 'manual'::text,
  source_id text,
  genres text[] NOT NULL DEFAULT '{}'::text[],
  content_rating text NOT NULL DEFAULT 'safe'::text,
  status text NOT NULL DEFAULT 'ongoing'::text,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_locked boolean NOT NULL DEFAULT false,
  lock_reason text NOT NULL DEFAULT ''::text,
  content_type text NOT NULL DEFAULT 'comic'::text,
  CONSTRAINT rotruyen_series_content_rating_check CHECK ((content_rating = ANY (ARRAY['safe'::text, 'suggestive'::text, 'erotica'::text]))),
  CONSTRAINT rotruyen_series_content_type_check CHECK ((content_type = ANY (ARRAY['comic'::text, 'novel'::text, 'light_novel'::text, 'web_novel'::text]))),
  CONSTRAINT rotruyen_series_pkey PRIMARY KEY (id),
  CONSTRAINT rotruyen_series_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT rotruyen_series_slug_key UNIQUE (slug),
  CONSTRAINT rotruyen_series_source_key_check CHECK ((source_key = ANY (ARRAY['manual'::text, 'mangadex'::text, 'longbook'::text]))),
  CONSTRAINT rotruyen_series_status_check CHECK ((status = ANY (ARRAY['ongoing'::text, 'completed'::text, 'hiatus'::text, 'cancelled'::text]))),
  CONSTRAINT rotruyen_series_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 240)))
);

CREATE TABLE public.rotruyen_settings (
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rotruyen_settings_key_check CHECK ((key ~ '^[a-z][a-z0-9_.-]{1,80}$'::text)),
  CONSTRAINT rotruyen_settings_pkey PRIMARY KEY (key)
);

CREATE TABLE public.rotruyen_user_library (
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  item_source text NOT NULL DEFAULT 'unknown'::text,
  title text NOT NULL DEFAULT ''::text,
  is_saved boolean NOT NULL DEFAULT false,
  last_chapter_id text,
  last_chapter_label text,
  progress_updated_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rotruyen_user_library_item_source_check CHECK ((item_source = ANY (ARRAY['database'::text, 'mangadex'::text, 'longbook'::text, 'unknown'::text]))),
  CONSTRAINT rotruyen_user_library_pkey PRIMARY KEY (user_id, item_id)
);

CREATE TABLE public.watch_room_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT watch_room_events_event_type_check CHECK ((event_type = ANY (ARRAY['play'::text, 'pause'::text, 'seek'::text, 'episode'::text, 'sync'::text, 'chat'::text, 'system'::text]))),
  CONSTRAINT watch_room_events_pkey PRIMARY KEY (id)
);

CREATE TABLE public.watch_room_members (
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT watch_room_members_pkey PRIMARY KEY (room_id, user_id)
);

CREATE TABLE public.watch_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  host_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Phòng xem RoFlix'::text,
  movie_slug text,
  movie_title text,
  episode_index integer NOT NULL DEFAULT 0,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  visibility text NOT NULL DEFAULT 'private'::text,
  chat_enabled boolean NOT NULL DEFAULT true,
  max_members integer NOT NULL DEFAULT 10,
  CONSTRAINT watch_rooms_code_check CHECK ((code ~ '^RF-[A-Z0-9]{5,10}$'::text)),
  CONSTRAINT watch_rooms_code_key UNIQUE (code),
  CONSTRAINT watch_rooms_episode_index_check CHECK ((episode_index >= 0)),
  CONSTRAINT watch_rooms_max_members_check CHECK (((max_members >= 2) AND (max_members <= 10))),
  CONSTRAINT watch_rooms_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))),
  CONSTRAINT watch_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT watch_rooms_status_check CHECK ((status = ANY (ARRAY['active'::text, 'ended'::text]))),
  CONSTRAINT watch_rooms_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'public'::text])))
);

-- 2. Foreign keys
ALTER TABLE community_comments ADD CONSTRAINT community_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES community_comments(id) ON DELETE CASCADE;
ALTER TABLE community_comments ADD CONSTRAINT community_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;
ALTER TABLE community_comments ADD CONSTRAINT community_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE community_likes ADD CONSTRAINT community_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;
ALTER TABLE community_likes ADD CONSTRAINT community_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE movie_comments ADD CONSTRAINT movie_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD CONSTRAINT notifications_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES community_comments(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_active_sessions ADD CONSTRAINT roflix_active_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_admin_audit_logs ADD CONSTRAINT roflix_admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_admin_audit_logs ADD CONSTRAINT roflix_admin_audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_admin_control_events ADD CONSTRAINT roflix_admin_control_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE roflix_admin_control_events ADD CONSTRAINT roflix_admin_control_events_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE roflix_admin_feature_flags ADD CONSTRAINT roflix_admin_feature_flags_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE roflix_custom_movies ADD CONSTRAINT roflix_custom_movies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE roflix_favorites_cloud ADD CONSTRAINT roflix_favorites_cloud_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_game_stats ADD CONSTRAINT roflix_game_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_gem_transactions ADD CONSTRAINT roflix_gem_transactions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_gem_transactions ADD CONSTRAINT roflix_gem_transactions_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_movie_comment_likes ADD CONSTRAINT roflix_movie_comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES roflix_movie_comments(id) ON DELETE CASCADE;
ALTER TABLE roflix_movie_comment_likes ADD CONSTRAINT roflix_movie_comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_movie_comment_moderation ADD CONSTRAINT roflix_movie_comment_moderation_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES roflix_movie_comments(id) ON DELETE CASCADE;
ALTER TABLE roflix_movie_comment_moderation ADD CONSTRAINT roflix_movie_comment_moderation_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE roflix_movie_comments ADD CONSTRAINT roflix_movie_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES roflix_movie_comments(id) ON DELETE CASCADE;
ALTER TABLE roflix_movie_comments ADD CONSTRAINT roflix_movie_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_movie_curation ADD CONSTRAINT roflix_movie_curation_curated_by_fkey FOREIGN KEY (curated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_movie_overrides ADD CONSTRAINT roflix_movie_overrides_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE roflix_movie_settings ADD CONSTRAINT roflix_movie_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE roflix_release_schedule ADD CONSTRAINT roflix_release_schedule_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_reports ADD CONSTRAINT roflix_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id);
ALTER TABLE roflix_site_events ADD CONSTRAINT roflix_site_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_sync_fingerprints ADD CONSTRAINT roflix_sync_fingerprints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_tv_featured ADD CONSTRAINT roflix_tv_featured_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_tv_settings ADD CONSTRAINT roflix_tv_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE roflix_watch_history ADD CONSTRAINT roflix_watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_watch_reward_claims ADD CONSTRAINT roflix_watch_reward_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE roflix_watchlist ADD CONSTRAINT roflix_watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE rohub_published_themes ADD CONSTRAINT rohub_published_themes_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE rohub_published_themes ADD CONSTRAINT rohub_published_themes_template_id_fkey FOREIGN KEY (template_id) REFERENCES rohub_templates(id) ON DELETE RESTRICT;
ALTER TABLE rohub_template_revisions ADD CONSTRAINT rohub_template_revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE rohub_template_revisions ADD CONSTRAINT rohub_template_revisions_template_id_fkey FOREIGN KEY (template_id) REFERENCES rohub_templates(id) ON DELETE CASCADE;
ALTER TABLE rohub_templates ADD CONSTRAINT rohub_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE rohub_templates ADD CONSTRAINT rohub_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE rotruyen_audit_logs ADD CONSTRAINT rotruyen_audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE rotruyen_chapters ADD CONSTRAINT rotruyen_chapters_series_id_fkey FOREIGN KEY (series_id) REFERENCES rotruyen_series(id) ON DELETE CASCADE;
ALTER TABLE rotruyen_series ADD CONSTRAINT rotruyen_series_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE rotruyen_settings ADD CONSTRAINT rotruyen_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE rotruyen_user_library ADD CONSTRAINT rotruyen_user_library_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE watch_room_events ADD CONSTRAINT watch_room_events_room_id_fkey FOREIGN KEY (room_id) REFERENCES watch_rooms(id) ON DELETE CASCADE;
ALTER TABLE watch_room_events ADD CONSTRAINT watch_room_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE watch_room_members ADD CONSTRAINT watch_room_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES watch_rooms(id) ON DELETE CASCADE;
ALTER TABLE watch_room_members ADD CONSTRAINT watch_room_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE watch_rooms ADD CONSTRAINT watch_rooms_host_id_fkey FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Secondary indexes
CREATE INDEX community_comments_parent_idx ON public.community_comments USING btree (parent_id);
CREATE INDEX community_comments_post_idx ON public.community_comments USING btree (post_id, created_at);
CREATE INDEX idx_community_comments_user ON public.community_comments USING btree (user_id);
CREATE INDEX community_likes_post_idx ON public.community_likes USING btree (post_id);
CREATE INDEX idx_community_likes_user ON public.community_likes USING btree (user_id);
CREATE INDEX community_posts_created_at_idx ON public.community_posts USING btree (created_at DESC);
CREATE INDEX community_posts_user_id_idx ON public.community_posts USING btree (user_id);
CREATE INDEX idx_community_posts_visible_created ON public.community_posts USING btree (status, created_at DESC);
CREATE INDEX movie_comments_movie_idx ON public.movie_comments USING btree (movie_slug, created_at DESC);
CREATE INDEX movie_comments_user_idx ON public.movie_comments USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_actor ON public.notifications USING btree (actor_id);
CREATE INDEX idx_notifications_comment ON public.notifications USING btree (comment_id);
CREATE INDEX idx_notifications_post ON public.notifications USING btree (post_id);
CREATE INDEX notifications_unread_idx ON public.notifications USING btree (user_id, read_at);
CREATE INDEX notifications_user_created_idx ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX profiles_last_seen_idx ON public.profiles USING btree (last_seen_at DESC);
CREATE INDEX idx_roflix_active_sessions_last_seen ON public.roflix_active_sessions USING btree (last_seen_at DESC);
CREATE INDEX idx_roflix_active_sessions_revoked ON public.roflix_active_sessions USING btree (revoked_at);
CREATE INDEX roflix_active_sessions_seen_idx ON public.roflix_active_sessions USING btree (last_seen_at DESC);
CREATE INDEX roflix_active_sessions_user_idx ON public.roflix_active_sessions USING btree (user_id);
CREATE INDEX idx_admin_audit_admin ON public.roflix_admin_audit_logs USING btree (admin_id);
CREATE INDEX idx_admin_audit_target ON public.roflix_admin_audit_logs USING btree (target_user_id);
CREATE INDEX roflix_admin_audit_created_idx ON public.roflix_admin_audit_logs USING btree (created_at DESC);
CREATE INDEX idx_roflix_admin_control_events_created_at ON public.roflix_admin_control_events USING btree (created_at DESC);
CREATE INDEX idx_roflix_admin_control_events_target_user ON public.roflix_admin_control_events USING btree (target_user_id, created_at DESC);
CREATE UNIQUE INDEX roflix_custom_movies_drive_file_id_uidx ON public.roflix_custom_movies USING btree (drive_file_id) WHERE (drive_file_id IS NOT NULL);
CREATE INDEX roflix_custom_movies_published_idx ON public.roflix_custom_movies USING btree (published, updated_at DESC);
CREATE INDEX roflix_favorites_cloud_user_idx ON public.roflix_favorites_cloud USING btree (user_id, created_at DESC);
CREATE INDEX idx_gem_tx_admin ON public.roflix_gem_transactions USING btree (admin_id);
CREATE INDEX roflix_gem_tx_created_idx ON public.roflix_gem_transactions USING btree (created_at DESC);
CREATE INDEX roflix_gem_tx_target_idx ON public.roflix_gem_transactions USING btree (target_user_id, created_at DESC);
CREATE INDEX roflix_movie_comment_likes_comment_idx ON public.roflix_movie_comment_likes USING btree (comment_id);
CREATE INDEX roflix_movie_comment_likes_user_idx ON public.roflix_movie_comment_likes USING btree (user_id);
CREATE INDEX roflix_movie_comment_moderation_updated_by_idx ON public.roflix_movie_comment_moderation USING btree (updated_by);
CREATE INDEX roflix_movie_comments_movie_idx ON public.roflix_movie_comments USING btree (movie_slug, created_at DESC);
CREATE INDEX roflix_movie_comments_parent_idx ON public.roflix_movie_comments USING btree (parent_id);
CREATE INDEX roflix_movie_comments_slug_created_idx ON public.roflix_movie_comments USING btree (movie_slug, created_at DESC);
CREATE INDEX roflix_movie_comments_user_idx ON public.roflix_movie_comments USING btree (user_id);
CREATE INDEX roflix_movie_curation_genre_keys_gin ON public.roflix_movie_curation USING gin (genre_keys);
CREATE INDEX roflix_movie_curation_list_keys_gin ON public.roflix_movie_curation USING gin (list_keys);
CREATE INDEX roflix_movie_curation_updated_idx ON public.roflix_movie_curation USING btree (updated_at DESC);
CREATE INDEX roflix_movie_overrides_hidden_idx ON public.roflix_movie_overrides USING btree (hidden);
CREATE INDEX roflix_movie_overrides_lookup_idx ON public.roflix_movie_overrides USING btree (source_id, movie_slug);
CREATE INDEX idx_release_schedule_created_by ON public.roflix_release_schedule USING btree (created_by);
CREATE INDEX roflix_release_schedule_release_idx ON public.roflix_release_schedule USING btree (release_at);
CREATE INDEX roflix_release_schedule_status_idx ON public.roflix_release_schedule USING btree (status, release_at);
CREATE INDEX idx_reports_reporter ON public.roflix_reports USING btree (reporter_id, created_at DESC);
CREATE INDEX idx_reports_status_created ON public.roflix_reports USING btree (status, created_at DESC);
CREATE INDEX idx_site_events_created_type ON public.roflix_site_events USING btree (created_at DESC, event_type);
CREATE INDEX roflix_site_events_created_idx ON public.roflix_site_events USING btree (created_at DESC);
CREATE INDEX roflix_site_events_movie_idx ON public.roflix_site_events USING btree (movie_slug, created_at DESC);
CREATE INDEX roflix_site_events_session_idx ON public.roflix_site_events USING btree (session_id, created_at DESC);
CREATE INDEX roflix_site_events_type_idx ON public.roflix_site_events USING btree (event_type, created_at DESC);
CREATE INDEX roflix_site_events_user_idx ON public.roflix_site_events USING btree (user_id, created_at DESC);
CREATE INDEX roflix_tv_featured_rank_idx ON public.roflix_tv_featured USING btree (enabled, rank, updated_at DESC);
CREATE INDEX idx_watch_history_user_updated ON public.roflix_watch_history USING btree (user_id, updated_at DESC);
CREATE INDEX roflix_watch_metrics_last_idx ON public.roflix_watch_metrics USING btree (last_watched_at DESC);
CREATE INDEX roflix_watch_metrics_movie_idx ON public.roflix_watch_metrics USING btree (movie_slug);
CREATE UNIQUE INDEX roflix_watch_reward_claims_user_bucket_uidx ON public.roflix_watch_reward_claims USING btree (user_id, claim_bucket);
CREATE INDEX roflix_watch_reward_claims_user_time_idx ON public.roflix_watch_reward_claims USING btree (user_id, claimed_at DESC);
CREATE INDEX roflix_watchlist_user_idx ON public.roflix_watchlist USING btree (user_id, created_at DESC);
CREATE INDEX roh_published_themes_lookup_idx ON public.rohub_published_themes USING btree (target_app, template_type);
CREATE INDEX roh_template_revisions_lookup_idx ON public.rohub_template_revisions USING btree (template_id, version DESC);
CREATE INDEX roh_template_revisions_timeline_idx ON public.rohub_template_revisions USING btree (template_id, created_at DESC);
CREATE INDEX roh_templates_app_type_status_idx ON public.rohub_templates USING btree (target_app, template_type, status);
CREATE INDEX roh_templates_updated_at_idx ON public.rohub_templates USING btree (updated_at DESC);
CREATE INDEX rotruyen_audit_created_idx ON public.rotruyen_audit_logs USING btree (created_at DESC);
CREATE INDEX rotruyen_chapters_series_idx ON public.rotruyen_chapters USING btree (series_id, chapter_number);
CREATE INDEX rotruyen_series_published_idx ON public.rotruyen_series USING btree (is_published, sort_order, updated_at DESC);
CREATE INDEX rotruyen_series_source_idx ON public.rotruyen_series USING btree (source_key, source_id);
CREATE INDEX rotruyen_user_library_updated_idx ON public.rotruyen_user_library USING btree (user_id, updated_at DESC);
CREATE INDEX idx_watch_room_events_room_created ON public.watch_room_events USING btree (room_id, created_at DESC);
CREATE INDEX idx_watch_room_events_user ON public.watch_room_events USING btree (user_id);
CREATE INDEX watch_room_events_room_idx ON public.watch_room_events USING btree (room_id, id DESC);
CREATE INDEX idx_watch_room_members_user ON public.watch_room_members USING btree (user_id, joined_at DESC);
CREATE INDEX watch_room_members_presence_idx ON public.watch_room_members USING btree (room_id, last_seen_at DESC);
CREATE INDEX watch_room_members_user_idx ON public.watch_room_members USING btree (user_id);
CREATE INDEX idx_watch_rooms_status_updated ON public.watch_rooms USING btree (status, updated_at DESC);
CREATE INDEX watch_rooms_code_idx ON public.watch_rooms USING btree (code);
CREATE INDEX watch_rooms_host_idx ON public.watch_rooms USING btree (host_id);
CREATE INDEX watch_rooms_public_active_idx ON public.watch_rooms USING btree (created_at DESC) WHERE ((status = 'active'::text) AND (visibility = 'public'::text));

-- 4. SQL functions
CREATE OR REPLACE FUNCTION public.roflix_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_movie_comment_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and public.roflix_is_admin() then
    if TG_OP = 'DELETE' then
      insert into public.roflix_admin_audit_logs(admin_id, action, details)
      values(auth.uid(), 'movie_comment_delete', jsonb_build_object('comment_id',OLD.id,'movie_slug',OLD.movie_slug));
    elsif TG_OP = 'UPDATE' then
      insert into public.roflix_admin_audit_logs(admin_id, action, details)
      values(auth.uid(), 'movie_comment_update', jsonb_build_object('comment_id',NEW.id,'movie_slug',NEW.movie_slug,'status',NEW.status));
    end if;
  end if;
  return coalesce(NEW, OLD);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_notify_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare post_owner uuid; parent_owner uuid;
begin
  select user_id into post_owner from public.community_posts where id = new.post_id;
  if new.parent_id is not null then
    select user_id into parent_owner from public.community_comments where id = new.parent_id;
    if parent_owner is not null and parent_owner <> new.user_id then
      insert into public.notifications(user_id, actor_id, type, title, body, post_id, comment_id)
      values(parent_owner, new.user_id, 'reply', '💬 Có người trả lời bình luận', left(new.body,1000), new.post_id, new.id);
    end if;
  end if;
  if post_owner is not null and post_owner <> new.user_id and (parent_owner is null or post_owner <> parent_owner) then
    insert into public.notifications(user_id, actor_id, type, title, body, post_id, comment_id)
    values(post_owner, new.user_id, 'comment', '💬 Có bình luận mới', left(new.body,1000), new.post_id, new.id);
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_notify_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare owner_id uuid;
begin
  select user_id into owner_id from public.community_posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, actor_id, type, title, body, post_id)
    values(owner_id, new.user_id, 'like', '❤️ Có người thích bài viết', 'Bài viết cộng đồng của bạn vừa nhận một lượt thích.', new.post_id);
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_protect_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.role is distinct from old.role and not public.roflix_is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_release_schedule_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null then
    insert into public.roflix_admin_audit_logs(admin_id, action, details)
    values (
      auth.uid(),
      case when TG_OP='INSERT' then 'schedule_create' when TG_OP='UPDATE' then 'schedule_update' else 'schedule_delete' end,
      jsonb_build_object(
        'schedule_id', coalesce(NEW.id, OLD.id),
        'movie_slug', coalesce(NEW.movie_slug, OLD.movie_slug),
        'title', coalesce(NEW.title, OLD.title),
        'operation', TG_OP
      )
    );
  end if;
  return coalesce(NEW, OLD);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_release_schedule_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.rohub_templates_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then new.version = old.version + 1; end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then new.published_at = now(); end if;
  if new.status <> 'published' then new.published_at = null; end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.rotruyen_library_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at=now(); return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.rotruyen_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at=now(); return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_adjust_gem(p_user_id uuid, p_delta bigint, p_reason text DEFAULT ''::text)
 RETURNS roflix_game_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g public.roflix_game_stats;
  v_before bigint;
  v_after bigint;
  v_action text;
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  if p_user_id is null then raise exception 'Target user is required'; end if;
  if p_delta = 0 then raise exception 'Gem change cannot be zero'; end if;
  if p_delta < 0 then v_action := 'remove'; else v_action := 'add'; end if;

  insert into public.roflix_game_stats(user_id) values(p_user_id)
  on conflict (user_id) do nothing;
  select * into g from public.roflix_game_stats where user_id=p_user_id for update;
  v_before := coalesce(g.gems,0);
  v_after := v_before + p_delta;
  if v_after < 0 then raise exception 'RoGem cannot be negative'; end if;

  update public.roflix_game_stats
  set gems=v_after,
      gems_earned=case when p_delta > 0 then gems_earned+p_delta else gems_earned end,
      updated_at=now()
  where user_id=p_user_id
  returning * into g;

  insert into public.roflix_gem_transactions(admin_id,target_user_id,action,delta,balance_before,balance_after,reason)
  values(auth.uid(),p_user_id,v_action,p_delta,v_before,v_after,left(coalesce(p_reason,''),500));

  insert into public.roflix_admin_audit_logs(admin_id,action,target_user_id,details)
  values(auth.uid(),'adjust_gem',p_user_id,jsonb_build_object(
    'action',v_action,'delta',p_delta,'balance_before',v_before,'balance_after',v_after,
    'reason',left(coalesce(p_reason,''),500)
  ));
  return g;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_analytics(p_days integer DEFAULT 30)
 RETURNS TABLE(day date, views bigint, plays bigint, unique_sessions bigint, new_users bigint, gacha_pulls bigint, watch_minutes bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.roflix_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    gs.d::date,
    (SELECT count(*) FROM public.roflix_site_events e WHERE e.created_at >= gs.d AND e.created_at < gs.d + interval '1 day' AND e.event_type = 'movie_view'),
    (SELECT count(*) FROM public.roflix_site_events e WHERE e.created_at >= gs.d AND e.created_at < gs.d + interval '1 day' AND e.event_type = 'movie_play'),
    (SELECT count(DISTINCT e.session_id) FROM public.roflix_site_events e WHERE e.created_at >= gs.d AND e.created_at < gs.d + interval '1 day'),
    (SELECT count(*) FROM public.profiles p WHERE p.created_at >= gs.d AND p.created_at < gs.d + interval '1 day'),
    (SELECT coalesce(sum(h.count), 0) FROM public.roflix_gacha_pull_history h WHERE h.created_at >= gs.d AND h.created_at < gs.d + interval '1 day'),
    (SELECT coalesce(sum(g.watch_minutes), 0) FROM public.roflix_game_stats g WHERE g.updated_at >= gs.d AND g.updated_at < gs.d + interval '1 day')
  FROM generate_series(
    current_date - greatest(1, least(90, coalesce(p_days, 30))) + 1,
    current_date,
    interval '1 day'
  ) AS gs(d)
  ORDER BY gs.d;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_cleanup_sessions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare deleted_count integer;
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  delete from public.roflix_active_sessions where last_seen_at < now() - interval '24 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_custom_movie_delete(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin if not roflix_is_admin() then raise exception 'Admin only'; end if; delete from public.roflix_custom_movies where id=p_id; return true; end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_custom_movie_upsert(p_id uuid DEFAULT NULL::uuid, p_slug text DEFAULT ''::text, p_title text DEFAULT ''::text, p_origin_name text DEFAULT ''::text, p_summary text DEFAULT ''::text, p_poster_url text DEFAULT ''::text, p_backdrop_url text DEFAULT ''::text, p_actors jsonb DEFAULT '[]'::jsonb, p_directors jsonb DEFAULT '[]'::jsonb, p_categories jsonb DEFAULT '[]'::jsonb, p_year integer DEFAULT NULL::integer, p_quality text DEFAULT 'HD'::text, p_lang text DEFAULT 'Vietsub'::text, p_trailer_url text DEFAULT ''::text, p_video_path text DEFAULT ''::text, p_video_mime text DEFAULT 'video/mp4'::text, p_locked boolean DEFAULT false, p_lock_reason text DEFAULT ''::text, p_published boolean DEFAULT true, p_admin_note text DEFAULT ''::text)
 RETURNS roflix_custom_movies
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.roflix_custom_movies;
begin
 if not roflix_is_admin() then raise exception 'Admin only'; end if;
 if length(trim(p_slug))<1 or length(trim(p_title))<1 or length(trim(p_video_path))<1 then raise exception 'Slug, title and video path are required'; end if;
 if lower(coalesce(p_video_mime,'')) <> 'video/mp4' then raise exception 'Only MP4 uploads are supported'; end if;
 insert into public.roflix_custom_movies(id,slug,title,origin_name,summary,poster_url,backdrop_url,actors,directors,categories,year,quality,lang,trailer_url,video_path,video_mime,locked,lock_reason,published,admin_note,created_by,updated_at)
 values(coalesce(p_id,gen_random_uuid()),left(trim(p_slug),200),left(trim(p_title),500),left(p_origin_name,500),p_summary,left(p_poster_url,2000),left(p_backdrop_url,2000),coalesce(p_actors,'[]'::jsonb),coalesce(p_directors,'[]'::jsonb),coalesce(p_categories,'[]'::jsonb),p_year,left(p_quality,100),left(p_lang,100),left(p_trailer_url,2000),left(p_video_path,1000),'video/mp4',p_locked,left(p_lock_reason,500),p_published,left(p_admin_note,2000),coalesce((select created_by from public.roflix_custom_movies where id=p_id),auth.uid()),now())
 on conflict(id) do update set slug=excluded.slug,title=excluded.title,origin_name=excluded.origin_name,summary=excluded.summary,poster_url=excluded.poster_url,backdrop_url=excluded.backdrop_url,actors=excluded.actors,directors=excluded.directors,categories=excluded.categories,year=excluded.year,quality=excluded.quality,lang=excluded.lang,trailer_url=excluded.trailer_url,video_path=excluded.video_path,video_mime='video/mp4',locked=excluded.locked,lock_reason=excluded.lock_reason,published=excluded.published,admin_note=excluded.admin_note,updated_at=now()
 returning * into r; return r;
end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_drive_movie_upsert(p_id uuid DEFAULT NULL::uuid, p_slug text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_origin_name text DEFAULT NULL::text, p_summary text DEFAULT NULL::text, p_poster_url text DEFAULT NULL::text, p_backdrop_url text DEFAULT NULL::text, p_year integer DEFAULT NULL::integer, p_quality text DEFAULT 'AUTO'::text, p_lang text DEFAULT 'Vietsub'::text, p_categories text DEFAULT '[]'::text, p_drive_file_id text DEFAULT NULL::text, p_drive_share_url text DEFAULT NULL::text, p_locked boolean DEFAULT false, p_lock_reason text DEFAULT NULL::text, p_published boolean DEFAULT false, p_admin_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare rid uuid;
begin
  if not public.roflix_is_admin() then raise exception 'admin only'; end if;
  if nullif(trim(p_drive_file_id),'') is null then raise exception 'Google Drive file ID is required'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'Movie title is required'; end if;
  if nullif(trim(p_slug),'') is null then raise exception 'Movie slug is required'; end if;
  if p_id is not null then
    update public.roflix_custom_movies set
      slug=trim(p_slug), title=trim(p_title), origin_name=coalesce(p_origin_name,''),
      summary=coalesce(p_summary,''), poster_url=coalesce(p_poster_url,''),
      backdrop_url=coalesce(p_backdrop_url,''), year=p_year,
      quality=coalesce(nullif(p_quality,''),'AUTO'), lang=coalesce(nullif(p_lang,''),'Vietsub'),
      categories=public.roflix_to_jsonb(p_categories),
      video_path='', video_mime='text/html',
      drive_file_id=trim(p_drive_file_id), drive_share_url=trim(p_drive_share_url),
      playback_mode='drive_preview', source_provider='google_drive',
      drive_permission_status='unchecked', drive_checked_at=null,
      locked=coalesce(p_locked,false), lock_reason=coalesce(p_lock_reason,''),
      published=coalesce(p_published,false), admin_note=coalesce(p_admin_note,''),
      updated_at=now()
    where id=p_id returning id into rid;
    if rid is null then raise exception 'Movie not found'; end if;
    return rid;
  end if;
  insert into public.roflix_custom_movies(
    slug,title,origin_name,summary,poster_url,backdrop_url,categories,year,quality,lang,
    video_path,video_mime,drive_file_id,drive_share_url,playback_mode,source_provider,
    drive_permission_status,locked,lock_reason,published,admin_note,created_by,updated_at
  ) values (
    trim(p_slug),trim(p_title),coalesce(p_origin_name,''),coalesce(p_summary,''),
    coalesce(p_poster_url,''),coalesce(p_backdrop_url,''),public.roflix_to_jsonb(p_categories),
    p_year,coalesce(nullif(p_quality,''),'AUTO'),coalesce(nullif(p_lang,''),'Vietsub'),
    '', 'text/html', trim(p_drive_file_id), trim(p_drive_share_url),
    'drive_preview','google_drive','unchecked',coalesce(p_locked,false),
    coalesce(p_lock_reason,''),coalesce(p_published,false),coalesce(p_admin_note,''),
    auth.uid(),now()
  ) returning id into rid;
  return rid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_find_game_users(p_query text DEFAULT ''::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, display_name text, role text, email text, level integer, exp bigint, gems bigint, gems_earned bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id,p.display_name,p.role,u.email,coalesce(g.level,1),coalesce(g.exp,0),coalesce(g.gems,0),coalesce(g.gems_earned,0)
  from public.profiles p
  join auth.users u on u.id=p.id
  left join public.roflix_game_stats g on g.user_id=p.id
  where public.roflix_is_admin()
    and (
      nullif(trim(p_query),'') is null
      or lower(coalesce(p.display_name,'')) like '%'||lower(trim(p_query))||'%'
      or lower(coalesce(u.email,'')) like '%'||lower(trim(p_query))||'%'
      or p.id::text = trim(p_query)
    )
  order by coalesce(g.gems,0) desc, p.created_at desc
  limit greatest(1,least(coalesce(p_limit,50),200));
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_live_ops()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  select jsonb_build_object('active_sessions',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes' and revoked_at is null),'watching_sessions',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes' and revoked_at is null and movie_slug is not null and movie_slug<>''),'authenticated_sessions',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes' and revoked_at is null and user_id is not null),'events_5m',(select count(*) from public.roflix_site_events where created_at>=now()-interval '5 minutes'),'errors_5m',(select count(*) from public.roflix_site_events where created_at>=now()-interval '5 minutes' and event_type in ('error','playback_error','api_error')),'restricted_users',(select count(*) from public.profiles where account_status in ('suspended','banned')),'last_event_at',(select max(created_at) from public.roflix_site_events),'last_control_event_at',(select max(created_at) from public.roflix_admin_control_events)) into result;
  return result;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_live_viewers()
 RETURNS TABLE(session_id text, user_id uuid, page text, movie_slug text, movie_title text, last_seen_at timestamp with time zone, is_authenticated boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  return query
  select a.session_id,a.user_id,a.page,a.movie_slug,a.movie_title,a.last_seen_at,(a.user_id is not null)
  from public.roflix_active_sessions a
  where a.last_seen_at >= now() - interval '5 minutes'
  order by a.last_seen_at desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_comment_delete(p_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$begin if not public.roflix_is_admin() then raise exception 'Admin required';end if;delete from public.roflix_movie_comments where id::text=p_id;delete from public.roflix_movie_comment_moderation where comment_id::text=p_id;return true;end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_comment_delete(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin
 if not roflix_is_admin() then raise exception 'Admin required'; end if;
 delete from roflix_movie_comments where id=p_id; return found;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_comment_status(p_id text, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$begin if not public.roflix_is_admin() then raise exception 'Admin required';end if;if p_status not in('visible','hidden') then raise exception 'Invalid status';end if;update public.roflix_movie_comments set status=p_status where id::text=p_id;insert into public.roflix_movie_comment_moderation(comment_id,status,updated_by) values(p_id::uuid,p_status,auth.uid()) on conflict(comment_id) do update set status=excluded.status,updated_by=excluded.updated_by,updated_at=now();return true;end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_comment_status(p_id uuid, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin
 if not roflix_is_admin() then raise exception 'Admin required'; end if;
 if p_status not in ('visible','hidden') then raise exception 'Invalid status'; end if;
 insert into roflix_movie_comment_moderation(comment_id,status,updated_by,updated_at) values(p_id,p_status,auth.uid(),now())
 on conflict(comment_id) do update set status=excluded.status,updated_by=excluded.updated_by,updated_at=now(); return true;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_curation_delete(p_source_id text, p_movie_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not roflix_is_admin() then raise exception 'Admin only'; end if;
  delete from public.roflix_movie_curation
   where source_id=p_source_id and movie_slug=p_movie_slug;
  return jsonb_build_object('success',true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_curation_upsert(p_source_id text, p_movie_slug text, p_movie_title text, p_origin_name text, p_poster_url text, p_year integer, p_type_key text, p_list_keys text[], p_genre_keys text[], p_source_genres text[], p_quality text, p_lang text, p_status text, p_auto_suggested boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  clean_lists text[] := array(select distinct v from unnest(coalesce(p_list_keys,'{}')) v where v <> '');
  clean_genres text[] := array(select distinct v from unnest(coalesce(p_genre_keys,'{}')) v where v <> '');
  clean_source_genres text[] := array(select distinct v from unnest(coalesce(p_source_genres,'{}')) v where v <> '');
  allowed_lists constant text[] := array['phim-moi','phim-le','phim-bo','dang-chieu','4k','long-tieng','thuyet-minh','subteam'];
  allowed_genres constant text[] := array[
    'chinh-kich','hai','bi-an','gia-dinh','hanh-dong','vien-tuong','hinh-su','kinh-di',
    'phieu-luu','khoa-hoc-vien-tuong','co-trang','vo-thuat','lang-man','gia-tuong',
    'chien-tranh','hoc-duong','hoat-hinh','tam-ly','hai-huoc','tinh-cam','tai-lieu',
    'am-nhac','the-thao','than-thoai','kinh-dien','chieu-rap','tre-em','phim-18-plus',
    'lich-su','mien-tay','phim-ngan','tv-shows','short-drama','action','fantasy'
  ];
begin
  if not roflix_is_admin() then raise exception 'Admin only'; end if;
  if p_source_id not in ('kkphim','vsmov','custom') then raise exception 'Invalid movie source'; end if;
  if nullif(trim(p_movie_slug),'') is null then raise exception 'Movie slug is required'; end if;
  if nullif(trim(p_movie_title),'') is null then raise exception 'Movie title is required'; end if;
  if exists(select 1 from unnest(clean_lists) v where not (v = any(allowed_lists))) then
    raise exception 'Invalid list category';
  end if;
  if exists(select 1 from unnest(clean_genres) v where not (v = any(allowed_genres))) then
    raise exception 'Invalid genre';
  end if;

  insert into public.roflix_movie_curation(
    source_id,movie_slug,movie_title,origin_name,poster_url,year,type_key,
    list_keys,genre_keys,source_genres,quality,lang,status,auto_suggested,curated_by,updated_at
  )
  values(
    p_source_id,trim(p_movie_slug),left(trim(p_movie_title),250),left(coalesce(trim(p_origin_name),''),250),
    left(coalesce(trim(p_poster_url),''),2000),p_year,coalesce(nullif(trim(p_type_key),''),'phim-le'),
    clean_lists,clean_genres,clean_source_genres,left(coalesce(trim(p_quality),''),80),
    left(coalesce(trim(p_lang),''),160),left(coalesce(trim(p_status),''),80),coalesce(p_auto_suggested,false),
    auth.uid(),now()
  )
  on conflict (source_id,movie_slug) do update set
    movie_title=excluded.movie_title,
    origin_name=excluded.origin_name,
    poster_url=excluded.poster_url,
    year=excluded.year,
    type_key=excluded.type_key,
    list_keys=excluded.list_keys,
    genre_keys=excluded.genre_keys,
    source_genres=excluded.source_genres,
    quality=excluded.quality,
    lang=excluded.lang,
    status=excluded.status,
    auto_suggested=excluded.auto_suggested,
    curated_by=auth.uid(),
    updated_at=now();

  return jsonb_build_object('success',true,'source_id',p_source_id,'movie_slug',trim(p_movie_slug),'list_keys',clean_lists,'genre_keys',clean_genres);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_override_delete(p_source_id text, p_movie_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin if not roflix_is_admin() then raise exception 'Admin only'; end if; delete from public.roflix_movie_overrides where source_id=p_source_id and movie_slug=p_movie_slug; return true; end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_override_upsert(p_source_id text, p_movie_slug text, p_hidden boolean DEFAULT false, p_locked boolean DEFAULT false, p_lock_reason text DEFAULT ''::text, p_title text DEFAULT NULL::text, p_origin_name text DEFAULT NULL::text, p_summary text DEFAULT NULL::text, p_poster_url text DEFAULT NULL::text, p_backdrop_url text DEFAULT NULL::text, p_actors jsonb DEFAULT '[]'::jsonb, p_directors jsonb DEFAULT '[]'::jsonb, p_categories jsonb DEFAULT '[]'::jsonb, p_year integer DEFAULT NULL::integer, p_quality text DEFAULT NULL::text, p_lang text DEFAULT NULL::text, p_trailer_url text DEFAULT NULL::text, p_preferred_source_id text DEFAULT NULL::text, p_episodes jsonb DEFAULT NULL::jsonb, p_admin_note text DEFAULT ''::text)
 RETURNS roflix_movie_overrides
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.roflix_movie_overrides;
begin
 if not roflix_is_admin() then raise exception 'Admin only'; end if;
 if p_source_id not in ('kkphim','vsmov') then raise exception 'Invalid source'; end if;
 if p_preferred_source_id is not null and p_preferred_source_id not in ('kkphim','vsmov') then raise exception 'Invalid preferred source'; end if;
 insert into public.roflix_movie_overrides(source_id,movie_slug,hidden,locked,lock_reason,title,origin_name,summary,poster_url,backdrop_url,actors,directors,categories,year,quality,lang,trailer_url,preferred_source_id,episodes,admin_note,updated_by,updated_at)
 values(p_source_id,left(p_movie_slug,300),p_hidden,p_locked,left(coalesce(p_lock_reason,''),500),left(p_title,500),left(p_origin_name,500),p_summary,left(p_poster_url,2000),left(p_backdrop_url,2000),coalesce(p_actors,'[]'::jsonb),coalesce(p_directors,'[]'::jsonb),coalesce(p_categories,'[]'::jsonb),p_year,left(p_quality,100),left(p_lang,100),left(p_trailer_url,2000),p_preferred_source_id,p_episodes,left(coalesce(p_admin_note,''),2000),auth.uid(),now())
 on conflict(source_id,movie_slug) do update set hidden=excluded.hidden,locked=excluded.locked,lock_reason=excluded.lock_reason,title=excluded.title,origin_name=excluded.origin_name,summary=excluded.summary,poster_url=excluded.poster_url,backdrop_url=excluded.backdrop_url,actors=excluded.actors,directors=excluded.directors,categories=excluded.categories,year=excluded.year,quality=excluded.quality,lang=excluded.lang,trailer_url=excluded.trailer_url,preferred_source_id=excluded.preferred_source_id,episodes=excluded.episodes,admin_note=excluded.admin_note,updated_by=auth.uid(),updated_at=now()
 returning * into r; return r;
end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_movie_settings_update(p_lock_18_plus boolean, p_force_login boolean)
 RETURNS roflix_movie_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare r public.roflix_movie_settings; begin if not roflix_is_admin() then raise exception 'Admin only'; end if; update public.roflix_movie_settings set lock_18_plus=p_lock_18_plus,force_login_for_locked=p_force_login,updated_by=auth.uid(),updated_at=now() where id=true returning * into r; return r; end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_platform_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare out jsonb;
begin
 if not public.roflix_is_admin() then raise exception 'Admin only'; end if;
 select jsonb_build_object(
  'online', (select count(*) from public.roflix_active_sessions where last_seen_at>now()-interval '5 minutes'),
  'users', (select count(*) from public.profiles),
  'views_24h', (select count(*) from public.roflix_site_events where created_at>now()-interval '24 hours' and event_type in ('movie_view','movie_play')),
  'views_7d', (select count(*) from public.roflix_site_events where created_at>now()-interval '7 days' and event_type in ('movie_view','movie_play')),
  'new_users_7d', (select count(*) from public.profiles where created_at>now()-interval '7 days'),
  'gacha_pulls_7d', (select coalesce(sum(count),0) from public.roflix_gacha_pull_history where created_at>now()-interval '7 days'),
  'gems_earned_7d', (select coalesce(sum(gems_earned),0) from public.roflix_game_stats),
  'watch_minutes', (select coalesce(sum(watch_minutes),0) from public.roflix_game_stats),
  'open_reports', (select count(*) from public.roflix_reports where status='open')
 ) into out;
 return out;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_release_schedule_delete(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not public.roflix_is_admin() then raise exception 'Unauthorized: admin only'; end if;
  delete from public.roflix_release_schedule where id=p_id;
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_release_schedule_save(p_id uuid DEFAULT NULL::uuid, p_movie_slug text DEFAULT ''::text, p_title text DEFAULT ''::text, p_origin_name text DEFAULT ''::text, p_source_id text DEFAULT 'kkphim'::text, p_poster_url text DEFAULT NULL::text, p_release_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_summary text DEFAULT ''::text, p_note text DEFAULT ''::text, p_featured boolean DEFAULT false)
 RETURNS roflix_release_schedule
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_row public.roflix_release_schedule;
begin
  if v_user is null or not public.roflix_is_admin() then
    raise exception 'Unauthorized: admin only';
  end if;
  if nullif(trim(p_movie_slug),'') is null then raise exception 'Thiếu slug phim'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'Thiếu tên phim'; end if;
  if p_source_id not in ('kkphim','vsmov') then raise exception 'Nguồn phim không hợp lệ'; end if;
  if p_release_at is null then raise exception 'Thiếu thời gian phát sóng'; end if;

  if p_id is null then
    insert into public.roflix_release_schedule(
      movie_slug,title,origin_name,source_id,poster_url,release_at,summary,note,status,featured,created_by
    ) values (
      trim(p_movie_slug),trim(p_title),coalesce(trim(p_origin_name),''),p_source_id,nullif(trim(coalesce(p_poster_url,'')),''),p_release_at,coalesce(trim(p_summary),''),coalesce(trim(p_note),''),'scheduled',coalesce(p_featured,false),v_user
    ) returning * into v_row;
  else
    update public.roflix_release_schedule
    set movie_slug=trim(p_movie_slug),
        title=trim(p_title),
        origin_name=coalesce(trim(p_origin_name),''),
        source_id=p_source_id,
        poster_url=nullif(trim(coalesce(p_poster_url,'')),''),
        release_at=p_release_at,
        summary=coalesce(trim(p_summary),''),
        note=coalesce(trim(p_note),''),
        featured=coalesce(p_featured,false),
        status=case when p_release_at > now() then 'scheduled' else status end,
        updated_at=now()
    where id=p_id
    returning * into v_row;
    if v_row.id is null then raise exception 'Không tìm thấy lịch phim để cập nhật'; end if;
  end if;
  return v_row;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_reports()
 RETURNS SETOF roflix_reports
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select * from public.roflix_reports where public.roflix_is_admin() order by created_at desc limit 500; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_revoke_sessions(p_user_id uuid, p_session_id text DEFAULT NULL::text, p_reason text DEFAULT 'Admin force logout'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_user_id is null then raise exception 'User required'; end if;
  update public.roflix_active_sessions set revoked_at=now(),revoke_reason=left(coalesce(p_reason,''),500) where user_id=p_user_id and revoked_at is null and (p_session_id is null or session_id=p_session_id);
  get diagnostics v_count=row_count;
  update public.profiles set security_version=security_version+1 where id=p_user_id;
  insert into public.roflix_admin_audit_logs(admin_id,action,target_user_id,details) values(auth.uid(),'force_logout',p_user_id,jsonb_build_object('session_id',p_session_id,'revoked_count',v_count,'reason',left(coalesce(p_reason,''),500)));
  insert into public.roflix_admin_control_events(event_type,target_user_id,target_session_id,payload,created_by) values('force_logout',p_user_id,p_session_id,jsonb_build_object('revoked_count',v_count,'reason',left(coalesce(p_reason,''),500)),auth.uid());
  return v_count;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_schedule_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'scheduled', (select count(*) from public.roflix_release_schedule where status='scheduled'),
    'released', (select count(*) from public.roflix_release_schedule where status='released'),
    'next_release', (select jsonb_build_object('title',title,'release_at',release_at,'poster_url',poster_url) from public.roflix_release_schedule where status='scheduled' order by release_at asc limit 1)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_security_feed(p_limit integer DEFAULT 80)
 RETURNS TABLE(id bigint, action text, target_user_id uuid, details jsonb, created_at timestamp with time zone, admin_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  return query select l.id,l.action,l.target_user_id,l.details,l.created_at,l.admin_id from public.roflix_admin_audit_logs l order by l.created_at desc limit least(greatest(coalesce(p_limit,80),1),250);
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_set_account_control(p_user_id uuid, p_status text, p_suspend_minutes integer DEFAULT NULL::integer, p_reason text DEFAULT ''::text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_row public.profiles; v_until timestamptz; v_old_status text;
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_user_id is null or p_user_id = auth.uid() then raise exception 'Không thể tự khóa tài khoản admin hiện tại'; end if;
  if p_status not in ('active','suspended','banned') then raise exception 'Invalid account status'; end if;
  if p_suspend_minutes is not null and (p_suspend_minutes < 1 or p_suspend_minutes > 43200) then raise exception 'Invalid suspension duration'; end if;
  select account_status into v_old_status from public.profiles where id=p_user_id for update;
  if not found then raise exception 'User not found'; end if;
  if p_status='suspended' and p_suspend_minutes is not null then v_until := now() + make_interval(mins=>p_suspend_minutes); else v_until := null; end if;
  update public.profiles set account_status=p_status,suspended_until=v_until,security_version=security_version+1,admin_note=left(coalesce(p_reason,''),1000) where id=p_user_id returning * into v_row;
  insert into public.roflix_admin_audit_logs(admin_id,action,target_user_id,details) values(auth.uid(),'account_control',p_user_id,jsonb_build_object('new_status',p_status,'suspended_until',v_until,'reason',left(coalesce(p_reason,''),1000)));
  insert into public.roflix_admin_control_events(event_type,target_user_id,payload,created_by) values('account_status_changed',p_user_id,jsonb_build_object('status',p_status,'suspended_until',v_until,'reason',left(coalesce(p_reason,''),1000)),auth.uid());
  return v_row;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_set_feature_flag(p_key text, p_enabled boolean, p_config jsonb DEFAULT '{}'::jsonb)
 RETURNS roflix_admin_feature_flags
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_row public.roflix_admin_feature_flags;
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_key is null or length(trim(p_key))<2 or length(trim(p_key))>80 then raise exception 'Invalid feature key'; end if;
  insert into public.roflix_admin_feature_flags(key,enabled,config,updated_by,updated_at) values(trim(p_key),coalesce(p_enabled,false),coalesce(p_config,'{}'::jsonb),auth.uid(),now()) on conflict(key) do update set enabled=excluded.enabled,config=excluded.config,updated_by=excluded.updated_by,updated_at=now() returning * into v_row;
  insert into public.roflix_admin_audit_logs(admin_id,action,details) values(auth.uid(),'feature_flag_changed',jsonb_build_object('key',v_row.key,'enabled',v_row.enabled,'config',v_row.config));
  insert into public.roflix_admin_control_events(event_type,payload,created_by) values('feature_flag_changed',jsonb_build_object('key',v_row.key,'enabled',v_row.enabled,'config',v_row.config),auth.uid());
  return v_row;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_set_gem(p_user_id uuid, p_balance bigint, p_reason text DEFAULT ''::text)
 RETURNS roflix_game_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  g public.roflix_game_stats;
  v_before bigint;
  v_delta bigint;
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  if p_user_id is null then raise exception 'Target user is required'; end if;
  if p_balance < 0 then raise exception 'RoGem cannot be negative'; end if;

  insert into public.roflix_game_stats(user_id) values(p_user_id)
  on conflict (user_id) do nothing;
  select * into g from public.roflix_game_stats where user_id=p_user_id for update;
  v_before := coalesce(g.gems,0);
  v_delta := p_balance-v_before;

  update public.roflix_game_stats
  set gems=p_balance,
      gems_earned=case when v_delta > 0 then gems_earned+v_delta else gems_earned end,
      updated_at=now()
  where user_id=p_user_id
  returning * into g;

  insert into public.roflix_gem_transactions(admin_id,target_user_id,action,delta,balance_before,balance_after,reason)
  values(auth.uid(),p_user_id,'set',v_delta,v_before,p_balance,left(coalesce(p_reason,''),500));

  insert into public.roflix_admin_audit_logs(admin_id,action,target_user_id,details)
  values(auth.uid(),'set_gem',p_user_id,jsonb_build_object(
    'delta',v_delta,'balance_before',v_before,'balance_after',p_balance,
    'reason',left(coalesce(p_reason,''),500)
  ));
  return g;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_set_role(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  if p_role not in ('user','admin') then raise exception 'Invalid role'; end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then raise exception 'You cannot remove your own admin role'; end if;

  update public.profiles set role = p_role where id = p_user_id;
  insert into public.roflix_admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), 'set_role', p_user_id, jsonb_build_object('role',p_role));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_set_status(p_user_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('active','suspended','banned') then raise exception 'Invalid account status'; end if;
  if p_user_id = auth.uid() and p_status <> 'active' then raise exception 'You cannot disable your own account'; end if;

  update public.profiles set account_status = p_status where id = p_user_id;
  insert into public.roflix_admin_audit_logs(admin_id, action, target_user_id, details)
  values(auth.uid(), 'set_status', p_user_id, jsonb_build_object('status',p_status));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result jsonb; today_start timestamptz:=date_trunc('day',now());
begin
 if auth.uid() is null or not public.roflix_is_admin() then raise exception 'Admin access required'; end if;
 select jsonb_build_object(
 'users_total',(select count(*) from public.profiles),
 'admins_total',(select count(*) from public.profiles where role='admin'),
 'suspended_total',(select count(*) from public.profiles where account_status='suspended'),
 'banned_total',(select count(*) from public.profiles where account_status='banned'),
 'events_total',(select count(*) from public.roflix_site_events),
 'events_today',(select count(*) from public.roflix_site_events where created_at>=today_start),
 'visitors_today',(select count(distinct session_id) from public.roflix_site_events where created_at>=today_start),
 'registered_viewers_today',(select count(distinct user_id) from public.roflix_site_events where created_at>=today_start and user_id is not null),
 'movie_views_today',(select count(*) from public.roflix_site_events where event_type='movie_view' and created_at>=today_start),
 'movie_plays_today',(select count(*) from public.roflix_site_events where event_type='movie_play' and created_at>=today_start),
 'active_now',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes'),
 'active_authenticated_now',(select count(*) from public.roflix_active_sessions where last_seen_at>=now()-interval '5 minutes' and user_id is not null),
 'top_movies',(select coalesce(jsonb_agg(x order by x.views desc),'[]'::jsonb) from (select movie_slug,coalesce(max(movie_title),movie_slug) movie_title,count(*) views from public.roflix_site_events where event_type='movie_view' and movie_slug is not null group by movie_slug order by count(*) desc limit 10) x),
 'top_movies_30d',(select coalesce(jsonb_agg(x order by x.views desc),'[]'::jsonb) from (select movie_slug,coalesce(max(movie_title),movie_slug) movie_title,count(*) views from public.roflix_site_events where event_type='movie_view' and created_at>=now()-interval '30 days' and movie_slug is not null group by movie_slug order by count(*) desc limit 10) x),
 'daily_visitors',(select coalesce(jsonb_agg(x order by x.day_date),'[]'::jsonb) from (select date_trunc('day',created_at)::date as day_date,count(distinct session_id) visitors,count(*) events from public.roflix_site_events where created_at>=current_date-interval '13 days' group by 1 order by 1) x),
 'recent_events',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]'::jsonb) from (select event_type,session_id,user_id,page,movie_title,created_at from public.roflix_site_events order by created_at desc limit 30) x)
 ) into result;
 return result;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_tv_featured_delete(p_source_id text, p_movie_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not roflix_is_admin() then raise exception 'Admin only'; end if;
  delete from public.roflix_tv_featured where source_id=p_source_id and movie_slug=p_movie_slug;
  return jsonb_build_object('success',true);
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_tv_featured_upsert(p_source_id text, p_movie_slug text, p_title text, p_poster_url text, p_backdrop_url text, p_rank integer, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not roflix_is_admin() then raise exception 'Admin only'; end if;
  if p_source_id not in ('kkphim','vsmov') then raise exception 'Invalid source'; end if;
  if nullif(trim(p_movie_slug),'') is null or nullif(trim(p_title),'') is null then raise exception 'Movie data required'; end if;
  insert into public.roflix_tv_featured(source_id,movie_slug,title,poster_url,backdrop_url,rank,enabled,created_by,updated_at)
  values(p_source_id,trim(p_movie_slug),left(trim(p_title),250),left(coalesce(trim(p_poster_url),''),2000),
         left(coalesce(trim(p_backdrop_url),''),2000),coalesce(p_rank,0),coalesce(p_enabled,true),auth.uid(),now())
  on conflict(source_id,movie_slug) do update set title=excluded.title,poster_url=excluded.poster_url,
    backdrop_url=excluded.backdrop_url,rank=excluded.rank,enabled=excluded.enabled,
    created_by=auth.uid(),updated_at=now();
  return jsonb_build_object('success',true);
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_tv_settings_update(p_enabled boolean, p_default_source text, p_refresh_minutes integer, p_max_items integer, p_autoplay boolean, p_quality_mode text, p_show_hero boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not roflix_is_admin() then raise exception 'Admin only'; end if;
  if p_default_source not in ('auto','kkphim','vsmov') then raise exception 'Invalid source'; end if;
  if p_refresh_minutes < 5 or p_refresh_minutes > 120 then raise exception 'Invalid refresh interval'; end if;
  if p_max_items < 6 or p_max_items > 24 then raise exception 'Invalid max items'; end if;
  if p_quality_mode not in ('auto','720p','1080p','4k') then raise exception 'Invalid quality'; end if;
  update public.roflix_tv_settings set enabled=p_enabled,default_source=p_default_source,
    refresh_minutes=p_refresh_minutes,max_items=p_max_items,autoplay=p_autoplay,
    quality_mode=p_quality_mode,show_hero=p_show_hero,updated_by=auth.uid(),updated_at=now()
  where id=true;
  return jsonb_build_object('success',true);
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_user_sessions(p_user_id uuid)
 RETURNS TABLE(session_id text, page text, movie_slug text, movie_title text, last_seen_at timestamp with time zone, created_at timestamp with time zone, device_label text, revoked_at timestamp with time zone, revoke_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.roflix_is_admin() then raise exception 'Admin required'; end if;
  if p_user_id is null then raise exception 'User required'; end if;
  return query select s.session_id,s.page,s.movie_slug,s.movie_title,s.last_seen_at,s.created_at,s.device_label,s.revoked_at,s.revoke_reason from public.roflix_active_sessions s where s.user_id=p_user_id order by s.last_seen_at desc limit 100;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_users()
 RETURNS TABLE(id uuid, email text, display_name text, role text, account_status text, created_at timestamp with time zone, last_seen_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.roflix_is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    p.role,
    p.account_status,
    p.created_at,
    p.last_seen_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_watch_history(p_limit integer DEFAULT 200)
 RETURNS TABLE(event_id bigint, created_at timestamp with time zone, event_type text, session_id text, user_id uuid, user_email text, display_name text, movie_slug text, movie_title text, page text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if auth.uid() is null or not public.roflix_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 return query select e.id,e.created_at,e.event_type,e.session_id,e.user_id,u.email::text,p.display_name,e.movie_slug,e.movie_title,e.page
 from public.roflix_site_events e left join auth.users u on u.id=e.user_id left join public.profiles p on p.id=e.user_id
 where e.event_type in ('movie_view','movie_play','movie_detail','page_view') order by e.created_at desc
 limit greatest(1,least(coalesce(p_limit,200),500));
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_admin_watch_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v jsonb;
begin
 if auth.uid() is null or not public.roflix_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 select jsonb_build_object(
  'total_watch_seconds',(select coalesce(sum(watched_seconds),0) from public.roflix_watch_metrics),
  'completed_sessions',(select count(*) from public.roflix_watch_metrics where completed),
  'completion_rate',(select round(100.0*count(*) filter(where completed)/nullif(count(*),0),1) from public.roflix_watch_metrics),
  'top_watch_time',(select coalesce(jsonb_agg(x order by x.seconds desc),'[]'::jsonb) from (select movie_slug,max(movie_title) movie_title,sum(watched_seconds) seconds,count(*) sessions,count(*) filter(where completed) completed from public.roflix_watch_metrics group by movie_slug order by sum(watched_seconds) desc limit 10) x),
  'top_completed',(select coalesce(jsonb_agg(x order by x.completed desc),'[]'::jsonb) from (select movie_slug,max(movie_title) movie_title,count(*) filter(where completed) completed,count(*) sessions from public.roflix_watch_metrics group by movie_slug order by count(*) filter(where completed) desc limit 10) x)
 ) into v;
 return v;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_award_watch(p_movie_slug text, p_minutes integer DEFAULT 0, p_episode boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare u uuid:=auth.uid();g public.roflix_game_stats;gain integer:=1;claimed_today integer;new_level integer;slug text;begin if u is null then raise exception 'Login required';end if;slug:=left(trim(coalesce(p_movie_slug,'')),180);if slug='' then raise exception 'Movie slug required';end if;if slug !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$' then return jsonb_build_object('awarded',false,'reason','Invalid movie slug');end if;if exists(select 1 from public.roflix_watch_reward_claims where user_id=u and claimed_at>now()-interval '60 seconds') then return jsonb_build_object('awarded',false,'reason','Global watch reward cooldown');end if;if exists(select 1 from public.roflix_watch_reward_claims where user_id=u and movie_slug=slug and claimed_at>now()-interval '5 minutes') then return jsonb_build_object('awarded',false,'reason','Watch reward cooldown');end if;select coalesce(sum(claimed_minutes),0)::integer into claimed_today from public.roflix_watch_reward_claims where user_id=u and claimed_at>=date_trunc('day',now());if claimed_today>=240 then return jsonb_build_object('awarded',false,'reason','Daily watch reward limit reached');end if;insert into public.roflix_game_stats(user_id) values(u) on conflict(user_id) do nothing;insert into public.roflix_watch_reward_claims(user_id,movie_slug,claimed_minutes,claim_bucket) values(u,slug,gain,date_trunc('minute',now())) on conflict(user_id,claim_bucket) do nothing;if not found then return jsonb_build_object('awarded',false,'reason','Watch reward cooldown');end if;update public.roflix_game_stats set exp=coalesce(exp,0)+2,watch_minutes=coalesce(watch_minutes,0)+gain,updated_at=now() where user_id=u returning * into g;new_level:=greatest(1,floor(coalesce(g.exp,0)/1000)+1)::int;update public.roflix_game_stats set level=new_level,updated_at=now() where user_id=u returning * into g;return jsonb_build_object('awarded',true,'level',g.level,'exp',g.exp,'watch_minutes',g.watch_minutes,'awarded_minutes',gain);end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_cloud_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare u uuid := auth.uid();
begin
 if u is null then raise exception 'Login required'; end if;
 return jsonb_build_object(
  'profile', coalesce((select jsonb_build_object('id',p.id,'display_name',p.display_name,'role',p.role,'account_status',p.account_status,'bio',p.bio,'avatar_url',p.avatar_url,'banner_url',p.banner_url,'country',p.country,'profile_data',p.profile_data) from profiles p where p.id=u),'{}'::jsonb),
  'game', coalesce((select to_jsonb(g) from roflix_game_stats g where g.user_id=u),'{}'::jsonb),
  'favorites', coalesce((select jsonb_agg(movie_slug order by created_at desc) from roflix_favorites_cloud where user_id=u),'[]'::jsonb),
  'watchlist', coalesce((select jsonb_agg(jsonb_build_object('movie_slug',movie_slug,'movie_title',movie_title,'origin_name',origin_name,'poster_url',poster_url,'source_id',source_id,'created_at',created_at) order by created_at desc) from roflix_watchlist where user_id=u),'[]'::jsonb),
  'history', coalesce((select jsonb_agg(to_jsonb(h) order by updated_at desc) from roflix_watch_history h where h.user_id=u),'[]'::jsonb),
  'gacha', coalesce((select jsonb_agg(jsonb_build_object('card_key',card_key,'name',name,'movie',movie,'rarity',rarity,'image',image,'obtained_at',obtained_at) order by obtained_at desc) from roflix_gacha_inventory where user_id=u),'[]'::jsonb),
  'pity', coalesce((select pity_count from roflix_gacha_pity where user_id=u),0)
 );
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_create_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), split_part(COALESCE(NEW.email,''),'@',1), 'User'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_create_watch_room(p_name text DEFAULT 'Phòng xem RoFlix'::text, p_movie_slug text DEFAULT NULL::text, p_movie_title text DEFAULT NULL::text)
 RETURNS watch_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare r public.watch_rooms; c text; begin if auth.uid() is null then raise exception 'Login required'; end if; loop c:='RF-'||upper(substr(encode(gen_random_bytes(5),'hex'),1,5)); exit when not exists(select 1 from public.watch_rooms where code=c); end loop; insert into public.watch_rooms(code,host_id,name,movie_slug,movie_title) values(c,auth.uid(),left(coalesce(p_name,'Phòng xem RoFlix'),120),p_movie_slug,p_movie_title) returning * into r; insert into public.watch_room_members(room_id,user_id) values(r.id,auth.uid()) on conflict do nothing; return r; end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_create_watch_room_v2(p_name text DEFAULT 'Phòng xem RoFlix'::text, p_movie_slug text DEFAULT NULL::text, p_movie_title text DEFAULT NULL::text, p_visibility text DEFAULT 'private'::text, p_chat_enabled boolean DEFAULT true)
 RETURNS watch_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_room public.watch_rooms;
  v_code text;
  v_attempt integer := 0;
begin
  if v_user is null then raise exception 'Bạn cần đăng nhập để tạo phòng.'; end if;
  if p_visibility not in ('private','public') then raise exception 'Loại phòng không hợp lệ.'; end if;
  loop
    v_code := 'RF-' || upper(substr(md5(random()::text || clock_timestamp()::text),1,5));
    exit when not exists (select 1 from public.watch_rooms where code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then raise exception 'Không tạo được mã phòng, vui lòng thử lại.'; end if;
  end loop;

  insert into public.watch_rooms
    (code,host_id,name,movie_slug,movie_title,visibility,chat_enabled,max_members)
  values
    (v_code,v_user,left(coalesce(nullif(trim(p_name),''),'Phòng xem RoFlix'),120),
     p_movie_slug,p_movie_title,p_visibility,coalesce(p_chat_enabled,true),10)
  returning * into v_room;

  insert into public.watch_room_members(room_id,user_id)
  values (v_room.id,v_user)
  on conflict (room_id,user_id) do nothing;

  return v_room;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_delete_watch_history(p_slug text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if nullif(trim(p_slug),'') is null then delete from public.roflix_watch_history where user_id=auth.uid(); else delete from public.roflix_watch_history where user_id=auth.uid() and slug=trim(p_slug); end if;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_favorites_get()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(movie_slug order by created_at asc), '[]'::jsonb)
  from public.roflix_favorites_cloud
  where user_id = (select auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_favorites_replace(p_slugs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  item jsonb;
  slug text;
  count_saved integer := 0;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_slugs, '[]'::jsonb)) <> 'array' then raise exception 'p_slugs must be a JSON array'; end if;
  delete from public.roflix_favorites_cloud where user_id = uid;
  for item in select value from jsonb_array_elements(p_slugs) loop
    slug := nullif(left(trim(coalesce(item #>> '{}', '')), 300), '');
    if slug is not null then
      insert into public.roflix_favorites_cloud(user_id,movie_slug) values(uid,slug) on conflict do nothing;
      count_saved := count_saved + 1;
    end if;
  end loop;
  return jsonb_build_object('ok',true,'count',count_saved);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_heartbeat(p_session_id text, p_page text DEFAULT NULL::text, p_movie_slug text DEFAULT NULL::text, p_movie_title text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
begin
  if p_session_id is null or length(trim(p_session_id)) < 8 then
    raise exception 'Invalid session id';
  end if;

  insert into public.roflix_active_sessions(session_id, user_id, page, movie_slug, movie_title, last_seen_at)
  values (trim(p_session_id), v_user_id, left(p_page,200), left(p_movie_slug,300), left(p_movie_title,300), now())
  on conflict (session_id) do update set
    user_id = excluded.user_id,
    page = excluded.page,
    movie_slug = excluded.movie_slug,
    movie_title = excluded.movie_title,
    last_seen_at = now();

  if v_user_id is not null then
    update public.profiles set last_seen_at = now() where id = v_user_id;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_join_watch_room(p_code text)
 RETURNS watch_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  return public.roflix_join_watch_room_v2(p_code);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_join_watch_room_v2(p_code text)
 RETURNS watch_rooms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_room public.watch_rooms;
  v_count integer;
begin
  if v_user is null then raise exception 'Bạn cần đăng nhập để tham gia phòng.'; end if;
  select * into v_room
  from public.watch_rooms
  where code = upper(trim(p_code)) and status = 'active'
  for update;
  if not found then raise exception 'Không tìm thấy phòng hoặc phòng đã kết thúc.'; end if;

  update public.watch_room_members
     set last_seen_at=now()
   where room_id=v_room.id and user_id=v_user;
  if found then return v_room; end if;

  select count(*) into v_count
  from public.watch_room_members
  where room_id=v_room.id and last_seen_at > now()-interval '90 seconds';
  if v_count >= least(v_room.max_members,10) then
    raise exception 'Phòng đã đủ 10 người.';
  end if;

  insert into public.watch_room_members(room_id,user_id,last_seen_at)
  values(v_room.id,v_user,now())
  on conflict(room_id,user_id) do update set last_seen_at=now();
  return v_room;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_leaderboard(p_limit integer DEFAULT 50)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, avatar_url text, level integer, exp bigint, gems bigint, episodes_watched bigint, gacha_pulls bigint, score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    row_number() over (
      order by coalesce(g.level,1) desc,
               coalesce(g.exp,0) desc,
               coalesce(g.episodes_watched,0) desc,
               coalesce(g.gems_earned,0) desc
    ) as rank,
    p.id,
    p.display_name,
    p.avatar_url,
    coalesce(g.level,1),
    coalesce(g.exp,0),
    coalesce(g.gems,0),
    coalesce(g.episodes_watched,0),
    coalesce(g.gacha_pulls,0),
    (coalesce(g.level,1)*100000 + coalesce(g.exp,0) +
      coalesce(g.episodes_watched,0)*25 + coalesce(g.gacha_pulls,0)*5)::numeric as score
  from public.profiles p
  left join public.roflix_game_stats g on g.user_id = p.id
  where coalesce(p.account_status,'active') = 'active'
  order by coalesce(g.level,1) desc,
           coalesce(g.exp,0) desc,
           coalesce(g.episodes_watched,0) desc,
           coalesce(g.gems_earned,0) desc
  limit greatest(1,least(p_limit,100));
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_leaderboard(p_metric text DEFAULT 'level'::text)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, avatar_url text, level integer, exp bigint, gems bigint, movies_watched bigint, episodes_watched bigint, gacha_pulls bigint, gems_earned bigint, watch_minutes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select row_number() over(order by case when p_metric='exp' then gs.exp when p_metric='movies' then gs.movies_watched when p_metric='episodes' then gs.episodes_watched when p_metric='gacha' then gs.gacha_pulls when p_metric='gems_earned' then gs.gems_earned when p_metric='watch_minutes' then gs.watch_minutes else gs.level end desc, gs.exp desc) as rank,
 gs.user_id, coalesce(p.display_name,'RoFlix user'), coalesce(p.avatar_url,''), gs.level,gs.exp,gs.gems,gs.movies_watched,gs.episodes_watched,gs.gacha_pulls,gs.gems_earned,gs.watch_minutes
 from public.roflix_game_stats gs left join public.profiles p on p.id=gs.user_id where coalesce(p.account_status,'active')='active' order by case when p_metric='exp' then gs.exp when p_metric='movies' then gs.movies_watched when p_metric='episodes' then gs.episodes_watched when p_metric='gacha' then gs.gacha_pulls when p_metric='gems_earned' then gs.gems_earned when p_metric='watch_minutes' then gs.watch_minutes else gs.level end desc, gs.exp desc limit 100;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_leave_watch_room_v2(p_room_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_host uuid;
begin
  if v_user is null then raise exception 'Bạn cần đăng nhập.'; end if;
  select host_id into v_host from public.watch_rooms where id=p_room_id and status='active' for update;
  if not found then return false; end if;

  delete from public.watch_room_members where room_id=p_room_id and user_id=v_user;
  if v_host=v_user then
    update public.watch_rooms set status='ended',updated_at=now() where id=p_room_id;
    delete from public.watch_room_members where room_id=p_room_id;
  end if;
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_list_public_watch_rooms_v2()
 RETURNS TABLE(id uuid, code text, name text, movie_title text, member_count integer, max_members integer, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select r.id,r.code,r.name,r.movie_title,
         (select count(*)::integer from public.watch_room_members m where m.room_id=r.id and m.last_seen_at>now()-interval '90 seconds'),
         least(r.max_members,10),r.created_at
  from public.watch_rooms r
  where r.status='active' and r.visibility='public'
    and (select count(*) from public.watch_room_members m where m.room_id=r.id and m.last_seen_at>now()-interval '90 seconds') < least(r.max_members,10)
  order by r.created_at desc
  limit 30;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_movie_comment_create(p_movie_slug text, p_movie_title text DEFAULT ''::text, p_body text DEFAULT ''::text, p_parent_id text DEFAULT NULL::text)
 RETURNS roflix_movie_comments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare u uuid:=auth.uid();uname text;row public.roflix_movie_comments;parent uuid;begin if u is null then raise exception 'Login required';end if;if nullif(trim(coalesce(p_movie_slug,'')),'') is null then raise exception 'Movie slug required';end if;if char_length(trim(coalesce(p_body,'')))<1 or char_length(p_body)>3000 then raise exception 'Invalid comment body';end if;select coalesce(nullif(display_name,''),split_part(coalesce(email,'Khán Giả'),'@',1),'Khán Giả') into uname from public.profiles where id=u;uname:=left(coalesce(uname,'Khán Giả'),80);begin if nullif(trim(coalesce(p_parent_id,'')),'') is not null then parent:=p_parent_id::uuid;end if;exception when others then parent:=null;end;insert into public.roflix_movie_comments(movie_slug,movie_title,user_id,username,display_name,body,parent_id,status) values(left(trim(p_movie_slug),300),left(coalesce(p_movie_title,p_movie_slug),300),u,uname,uname,trim(p_body),parent,'visible') returning * into row;return row;end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_movie_comment_like(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare u uuid:=auth.uid();exists_like boolean;begin if u is null then raise exception 'Login required';end if;if nullif(trim(coalesce(p_id,'')),'') is null then raise exception 'Comment required';end if;select exists(select 1 from public.roflix_movie_comment_likes where comment_id::text=p_id and user_id=u) into exists_like;if exists_like then delete from public.roflix_movie_comment_likes where comment_id::text=p_id and user_id=u;return jsonb_build_object('liked',false);end if;insert into public.roflix_movie_comment_likes(comment_id,user_id) values(p_id::uuid,u) on conflict do nothing;return jsonb_build_object('liked',true);end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_movie_comment_like(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare uid uuid:=auth.uid(); liked boolean; total bigint; begin
 if uid is null then raise exception 'Login required'; end if;
 select exists(select 1 from roflix_movie_comment_likes where comment_id=p_id and user_id=uid) into liked;
 if liked then delete from roflix_movie_comment_likes where comment_id=p_id and user_id=uid; liked:=false; else insert into roflix_movie_comment_likes(comment_id,user_id) values(p_id,uid) on conflict do nothing; liked:=true; end if;
 select count(*) into total from roflix_movie_comment_likes where comment_id=p_id; return jsonb_build_object('liked',liked,'count',total);
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_movie_comment_set_status(p_id uuid, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin
 if not roflix_is_admin() then raise exception 'Admin required'; end if;
 if p_status not in ('visible','hidden') then raise exception 'Invalid status'; end if;
 update roflix_movie_comments set body=body where id=p_id;
 -- The current realtime table intentionally has no status column. Moderation is handled by a separate audit flag table below.
 return false;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_profile_get()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p jsonb;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  insert into public.profiles(id) values(auth.uid()) on conflict(id) do nothing;
  select coalesce(profile_data,'{}'::jsonb) into p from public.profiles where id=auth.uid();
  return jsonb_build_object('profile_data', coalesce(p,'{}'::jsonb));
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_profile_sync(p_profile jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare clean jsonb; fp text;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if jsonb_typeof(coalesce(p_profile,'{}'::jsonb)) <> 'object' then raise exception 'Invalid profile'; end if;
  clean := jsonb_build_object(
    'name', left(coalesce(p_profile->>'name','Người dùng'),80),
    'avatar', left(coalesce(p_profile->>'avatar','default'),500),
    'bio', left(coalesce(p_profile->>'bio',''),500),
    'banner', left(coalesce(p_profile->>'banner','default'),500),
    'country', left(coalesce(p_profile->>'country','Việt Nam'),80),
    'favoriteMovie', left(coalesce(p_profile->>'favoriteMovie',''),160),
    'birthday', left(coalesce(p_profile->>'birthday',''),20),
    'joinDate', left(coalesce(p_profile->>'joinDate',''),30)
  );
  fp := md5(clean::text);
  if exists(select 1 from public.roflix_sync_fingerprints where user_id=auth.uid() and kind='profile' and fingerprint=fp and updated_at > now()-interval '60 seconds') then
    return jsonb_build_object('profile_data',clean);
  end if;
  insert into public.roflix_sync_fingerprints(user_id,kind,fingerprint) values(auth.uid(),'profile',fp)
  on conflict(user_id,kind) do update set fingerprint=excluded.fingerprint,updated_at=now();
  insert into public.profiles(id,profile_data) values(auth.uid(),clean)
  on conflict(id) do update set profile_data=clean;
  return jsonb_build_object('profile_data',clean);
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_public_profile(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id',p.id,
    'display_name',p.display_name,
    'bio',p.bio,
    'avatar_url',p.avatar_url,
    'banner_url',p.banner_url,
    'country',p.country,
    'created_at',p.created_at,
    'level',coalesce(gs.level,1),
    'exp',coalesce(gs.exp,0),
    'movies_watched',coalesce(gs.movies_watched,0),
    'episodes_watched',coalesce(gs.episodes_watched,0),
    'watch_minutes',coalesce(gs.watch_minutes,0),
    'gacha_pulls',coalesce(gs.gacha_pulls,0)
  )
  from public.profiles p
  left join public.roflix_game_stats gs on gs.user_id = p.id
  where p.id = p_user_id
    and coalesce(p.account_status,'active') = 'active';
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_record_watch_progress(p_session_id text, p_movie_slug text, p_movie_title text, p_seconds integer, p_duration_seconds integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_seconds integer:=greatest(0,least(coalesce(p_seconds,0),30)); v_duration integer:=case when p_duration_seconds between 1 and 86400 then p_duration_seconds else null end; v_result jsonb;
begin
 if p_session_id is null or length(trim(p_session_id))<8 or p_movie_slug is null or length(trim(p_movie_slug))=0 then raise exception 'Invalid watch session'; end if;
 insert into public.roflix_watch_metrics(session_id,movie_slug,movie_title,user_id,watched_seconds,duration_seconds,completed,last_watched_at)
 values(left(trim(p_session_id),160),left(trim(p_movie_slug),300),left(p_movie_title,300),auth.uid(),v_seconds,v_duration,false,now())
 on conflict(session_id,movie_slug) do update set
  movie_title=coalesce(excluded.movie_title,roflix_watch_metrics.movie_title),
  user_id=coalesce(auth.uid(),roflix_watch_metrics.user_id),
  watched_seconds=least(roflix_watch_metrics.watched_seconds+v_seconds,86400),
  duration_seconds=coalesce(excluded.duration_seconds,roflix_watch_metrics.duration_seconds),
  completed=case when coalesce(excluded.duration_seconds,roflix_watch_metrics.duration_seconds) is not null then (roflix_watch_metrics.watched_seconds+v_seconds)>=coalesce(excluded.duration_seconds,roflix_watch_metrics.duration_seconds)*0.9 else false end,
  last_watched_at=now();
 select jsonb_build_object('watched_seconds',watched_seconds,'duration_seconds',duration_seconds,'completed',completed) into v_result
 from public.roflix_watch_metrics where session_id=left(trim(p_session_id),160) and movie_slug=left(trim(p_movie_slug),300);
 return v_result;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_submit_report(p_target_type text, p_target_id text, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare id uuid; begin if auth.uid() is null then raise exception 'Login required'; end if; insert into public.roflix_reports(reporter_id,target_type,target_id,reason) values(auth.uid(),p_target_type,left(p_target_id,200),left(p_reason,500)) returning roflix_reports.id into id; return id; end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_sync_game_state(p_level integer, p_exp bigint, p_gems bigint, p_gems_earned bigint, p_movies_watched bigint, p_episodes_watched bigint, p_comments_count bigint, p_favorites_count bigint, p_watch_minutes bigint, p_gacha_pulls bigint)
 RETURNS roflix_game_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare r public.roflix_game_stats;begin if auth.uid() is null then raise exception 'Login required';end if;insert into public.roflix_game_stats(user_id) values(auth.uid()) on conflict(user_id) do nothing;select * into r from public.roflix_game_stats where user_id=auth.uid();return r;end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_sync_release_schedule()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  n integer;
begin
  update public.roflix_release_schedule
  set status = 'released', released_at = coalesce(released_at, now()), updated_at = now()
  where status = 'scheduled' and release_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_sync_watch_history(p_slug text, p_title text DEFAULT NULL::text, p_poster text DEFAULT NULL::text, p_episode integer DEFAULT 0, p_episode_name text DEFAULT NULL::text, p_progress numeric DEFAULT 0, p_source_id text DEFAULT NULL::text, p_genres jsonb DEFAULT '[]'::jsonb)
 RETURNS roflix_watch_history
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.roflix_watch_history;
begin
  if auth.uid() is null or nullif(trim(p_slug),'') is null then raise exception 'Unauthorized or invalid movie slug'; end if;
  insert into public.roflix_watch_history(user_id,slug,title,poster,episode,episode_name,progress,source_id,genres,updated_at)
  values(auth.uid(),trim(p_slug),p_title,p_poster,greatest(0,coalesce(p_episode,0)),p_episode_name,greatest(0,least(1,coalesce(p_progress,0))),p_source_id,coalesce(p_genres,'[]'::jsonb),now())
  on conflict(user_id,slug) do update set title=excluded.title,poster=excluded.poster,episode=excluded.episode,episode_name=excluded.episode_name,progress=excluded.progress,source_id=excluded.source_id,genres=excluded.genres,updated_at=now()
  returning * into r;
  return r;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_track_event(p_event_type text, p_session_id text, p_page text DEFAULT NULL::text, p_movie_slug text DEFAULT NULL::text, p_movie_title text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user_id uuid:=auth.uid();
begin
  if p_event_type not in ('page_view','movie_view','movie_play','movie_detail','search','heartbeat','login','signup','logout') then raise exception 'Invalid analytics event type'; end if;
  if p_session_id is null or length(trim(p_session_id))<8 then raise exception 'Invalid session id'; end if;
  if exists(select 1 from public.roflix_site_events where session_id=trim(p_session_id) and event_type=p_event_type and created_at>now()-interval '5 seconds') then return; end if;
  insert into public.roflix_site_events(event_type,session_id,user_id,page,movie_slug,movie_title,metadata)
  values(p_event_type,trim(p_session_id),v_user_id,left(p_page,200),left(p_movie_slug,300),left(p_movie_title,300),coalesce(p_metadata,'{}'::jsonb));
  if v_user_id is not null then update public.profiles set last_seen_at=now() where id=v_user_id; end if;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_update_profile(p_display_name text, p_bio text, p_avatar_url text, p_banner_url text, p_country text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare u uuid:=auth.uid(); r public.profiles;
begin
 if u is null then raise exception 'Login required'; end if;
 update public.profiles set display_name=left(coalesce(p_display_name,display_name),80), bio=left(coalesce(p_bio,''),1000), avatar_url=left(coalesce(p_avatar_url,''),1000), banner_url=left(coalesce(p_banner_url,''),1000), country=left(coalesce(p_country,'Việt Nam'),80) where id=u returning * into r;
 return jsonb_build_object('id',r.id,'display_name',r.display_name,'bio',r.bio,'avatar_url',r.avatar_url,'banner_url',r.banner_url,'country',r.country);
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_user_adjust_gem(p_delta bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare g bigint;begin if auth.uid() is null then raise exception 'Login required';end if;insert into public.roflix_game_stats(user_id) values(auth.uid()) on conflict(user_id) do nothing;select coalesce(gems,0) into g from public.roflix_game_stats where user_id=auth.uid();return jsonb_build_object('gems',g,'mutated',false,'ignored_delta',coalesce(p_delta,0));end;$function$
;

CREATE OR REPLACE FUNCTION public.roflix_user_get_gem()
 RETURNS roflix_game_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.roflix_game_stats;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  insert into public.roflix_game_stats(user_id) values(auth.uid()) on conflict(user_id) do nothing;
  select * into g from public.roflix_game_stats where user_id=auth.uid();
  return g;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_watch_history_get()
 RETURNS SETOF roflix_watch_history
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select * from public.roflix_watch_history where user_id=auth.uid() order by updated_at desc limit 100; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_watch_history_sync(p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare item jsonb; n integer:=0; fp text;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array' then raise exception 'Invalid history'; end if;
  if jsonb_array_length(p_items)>100 then raise exception 'Too many history items'; end if;
  fp := md5(p_items::text);
  if exists(select 1 from public.roflix_sync_fingerprints where user_id=auth.uid() and kind='history' and fingerprint=fp and updated_at > now()-interval '60 seconds') then return 0; end if;
  insert into public.roflix_sync_fingerprints(user_id,kind,fingerprint) values(auth.uid(),'history',fp)
  on conflict(user_id,kind) do update set fingerprint=excluded.fingerprint,updated_at=now();
  for item in select * from jsonb_array_elements(p_items) loop
    if nullif(trim(item->>'slug'),'') is null then continue; end if;
    insert into public.roflix_watch_history(user_id,slug,title,poster,episode,episode_name,progress,source_id,genres,updated_at)
    values(auth.uid(),left(trim(item->>'slug'),300),left(item->>'title',300),left(item->>'poster',1000),greatest(0,coalesce((item->>'episode')::int,0)),left(item->>'episode_name',200),greatest(0,least(1,coalesce((item->>'progress')::numeric,0))),left(item->>'source_id',50),case when jsonb_typeof(item->'genres')='array' then item->'genres' else '[]'::jsonb end,now())
    on conflict(user_id,slug) do update set title=excluded.title,poster=excluded.poster,episode=excluded.episode,episode_name=excluded.episode_name,progress=excluded.progress,source_id=excluded.source_id,genres=excluded.genres,updated_at=greatest(public.roflix_watch_history.updated_at,excluded.updated_at);
    n:=n+1;
  end loop;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_watch_room_event(p_room_id uuid, p_event_type text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := auth.uid();
  v_chat_enabled boolean;
begin
  if v_user is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if p_event_type not in ('play','pause','seek','episode','sync','chat','system') then
    raise exception 'Loại sự kiện không hợp lệ.';
  end if;
  select r.chat_enabled into v_chat_enabled
  from public.watch_rooms r
  join public.watch_room_members m on m.room_id=r.id
  where r.id=p_room_id and r.status='active' and m.user_id=v_user;
  if not found then raise exception 'Bạn không thuộc phòng này.'; end if;
  if p_event_type='chat' and not coalesce(v_chat_enabled,true) then
    raise exception 'Chat đã bị tắt trong phòng này.';
  end if;
  insert into public.watch_room_events(room_id,user_id,event_type,payload)
  values(p_room_id,v_user,p_event_type,coalesce(p_payload,'{}'::jsonb));
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_watch_room_heartbeat_v2(p_room_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Bạn cần đăng nhập.'; end if;
  update public.watch_room_members
     set last_seen_at=now()
   where room_id=p_room_id and user_id=v_user;
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.roflix_watch_room_snapshot(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r watch_rooms;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 select * into r from watch_rooms where code=upper(trim(p_code)) and status='active';
 if not found then raise exception 'Room not found'; end if;
 if not exists(select 1 from watch_room_members where room_id=r.id and user_id=auth.uid()) then raise exception 'Not a room member'; end if;
 return jsonb_build_object('room',to_jsonb(r),'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'joined_at',m.joined_at)) from watch_room_members m where m.room_id=r.id),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from watch_room_events e where e.room_id=r.id limit 50),'[]'::jsonb));
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_watch_room_update_state(p_room_id uuid, p_state jsonb, p_movie_slug text DEFAULT NULL::text, p_movie_title text DEFAULT NULL::text, p_episode_index integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin
 if auth.uid() is null or not exists(select 1 from watch_rooms where id=p_room_id and host_id=auth.uid() and status='active') then raise exception 'Host required'; end if;
 update watch_rooms set state=coalesce(p_state,'{}'::jsonb),movie_slug=coalesce(p_movie_slug,movie_slug),movie_title=coalesce(p_movie_title,movie_title),episode_index=coalesce(p_episode_index,episode_index),updated_at=now() where id=p_room_id; return found;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_watchlist_get()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('movie_slug',movie_slug,'movie_title',movie_title,'origin_name',origin_name,'poster_url',poster_url,'source_id',source_id,'created_at',created_at) order by created_at desc) from roflix_watchlist where user_id=auth.uid()),'[]'::jsonb);
end; $function$
;

CREATE OR REPLACE FUNCTION public.roflix_watchlist_replace(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare item jsonb; n integer:=0;
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array' or jsonb_array_length(p_items)>200 then raise exception 'Invalid watchlist'; end if;
 delete from roflix_watchlist where user_id=auth.uid();
 for item in select * from jsonb_array_elements(p_items) loop
  if nullif(trim(item->>'movie_slug'),'') is null then continue; end if;
  insert into roflix_watchlist(user_id,movie_slug,movie_title,origin_name,poster_url,source_id)
  values(auth.uid(),left(trim(item->>'movie_slug'),300),left(item->>'movie_title',300),left(item->>'origin_name',300),left(item->>'poster_url',1000),left(coalesce(item->>'source_id','kkphim'),50)); n:=n+1;
 end loop; return jsonb_build_object('ok',true,'count',n);
end; $function$
;

CREATE OR REPLACE FUNCTION public.rohub_storage_cleanup_scan(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage', 'pg_temp'
AS $function$
declare v_result jsonb;
begin
 if auth.uid() is null or not public.roflix_is_admin() or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and (p.account_status is null or p.account_status='active')) then raise exception 'Active admin access required' using errcode='42501'; end if;
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
end $function$
;

-- 5. Trigger functions
CREATE OR REPLACE FUNCTION public.roflix_movie_comment_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and public.roflix_is_admin() then
    if TG_OP = 'DELETE' then
      insert into public.roflix_admin_audit_logs(admin_id, action, details)
      values(auth.uid(), 'movie_comment_delete', jsonb_build_object('comment_id',OLD.id,'movie_slug',OLD.movie_slug));
    elsif TG_OP = 'UPDATE' then
      insert into public.roflix_admin_audit_logs(admin_id, action, details)
      values(auth.uid(), 'movie_comment_update', jsonb_build_object('comment_id',NEW.id,'movie_slug',NEW.movie_slug,'status',NEW.status));
    end if;
  end if;
  return coalesce(NEW, OLD);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.roflix_notify_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare post_owner uuid; parent_owner uuid;
begin
  select user_id into post_owner from public.community_posts where id = new.post_id;
  if new.parent_id is not null then
    select user_id into parent_owner from public.community_comments where id = new.parent_id;
    if parent_owner is not null and parent_owner <> new.user_id then
      insert into public.notifications(user_id, actor_id, type, title, body, post_id, comment_id)
      values(parent_owner, new.user_id, 'reply', '💬 Có người trả lời bình luận', left(new.body,1000), new.post_id, new.id);
    end if;
  end if;
  if post_owner is not null and post_owner <> new.user_id and (parent_owner is null or post_owner <> parent_owner) then
    insert into public.notifications(user_id, actor_id, type, title, body, post_id, comment_id)
    values(post_owner, new.user_id, 'comment', '💬 Có bình luận mới', left(new.body,1000), new.post_id, new.id);
  end if;
  return new;
end; $function$
;
CREATE OR REPLACE FUNCTION public.roflix_notify_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare owner_id uuid;
begin
  select user_id into owner_id from public.community_posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, actor_id, type, title, body, post_id)
    values(owner_id, new.user_id, 'like', '❤️ Có người thích bài viết', 'Bài viết cộng đồng của bạn vừa nhận một lượt thích.', new.post_id);
  end if;
  return new;
end; $function$
;
CREATE OR REPLACE FUNCTION public.roflix_protect_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.role is distinct from old.role and not public.roflix_is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.roflix_release_schedule_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null then
    insert into public.roflix_admin_audit_logs(admin_id, action, details)
    values (
      auth.uid(),
      case when TG_OP='INSERT' then 'schedule_create' when TG_OP='UPDATE' then 'schedule_update' else 'schedule_delete' end,
      jsonb_build_object(
        'schedule_id', coalesce(NEW.id, OLD.id),
        'movie_slug', coalesce(NEW.movie_slug, OLD.movie_slug),
        'title', coalesce(NEW.title, OLD.title),
        'operation', TG_OP
      )
    );
  end if;
  return coalesce(NEW, OLD);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.roflix_release_schedule_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.roflix_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end; $function$
;
CREATE OR REPLACE FUNCTION public.rohub_templates_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then new.version = old.version + 1; end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then new.published_at = now(); end if;
  if new.status <> 'published' then new.published_at = null; end if;
  return new;
end; $function$
;
CREATE OR REPLACE FUNCTION public.rotruyen_library_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at=now(); return new; end; $function$
;
CREATE OR REPLACE FUNCTION public.rotruyen_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at=now(); return new; end; $function$
;

-- 6. Row-level security state
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_admin_control_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_admin_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_custom_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_favorites_cloud ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_gem_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_movie_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_movie_comment_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_movie_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_movie_curation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_movie_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_movie_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_release_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_sync_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_tv_featured ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_tv_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_watch_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_watch_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roflix_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rohub_published_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rohub_template_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rohub_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotruyen_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotruyen_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotruyen_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotruyen_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotruyen_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotruyen_user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_room_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_rooms ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies (public + storage)
CREATE POLICY "comments delete own or admin" ON public.community_comments AS permissive FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "comments insert own" ON public.community_comments AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "comments read visible posts" ON public.community_comments AS permissive FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM community_posts p
  WHERE ((p.id = community_comments.post_id) AND ((p.status = 'visible'::text) OR roflix_is_admin())))));
CREATE POLICY "comments update own or admin" ON public.community_comments AS permissive FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin())) WITH CHECK (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "likes delete own" ON public.community_likes AS permissive FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "likes insert own" ON public.community_likes AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "likes read" ON public.community_likes AS permissive FOR SELECT TO authenticated USING (true);
CREATE POLICY "authors or admin delete posts" ON public.community_posts AS permissive FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "authors or admin update posts" ON public.community_posts AS permissive FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin())) WITH CHECK (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "read visible posts or admin" ON public.community_posts AS permissive FOR SELECT TO authenticated USING (((status = 'visible'::text) OR roflix_is_admin()));
CREATE POLICY "users insert own visible post" ON public.community_posts AS permissive FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (status = 'visible'::text)));
CREATE POLICY "movie comments own delete" ON public.movie_comments AS permissive FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "movie comments own insert" ON public.movie_comments AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "movie comments own update" ON public.movie_comments AS permissive FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin())) WITH CHECK (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "movie comments public visible read" ON public.movie_comments AS permissive FOR SELECT TO anon,authenticated USING (((status = 'visible'::text) OR roflix_is_admin()));
CREATE POLICY "notifications read own" ON public.notifications AS permissive FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "notifications update own" ON public.notifications AS permissive FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "profiles read own or admin" ON public.profiles AS permissive FOR SELECT TO authenticated USING (((id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "profiles update own display name" ON public.profiles AS permissive FOR UPDATE TO authenticated USING (((id = auth.uid()) OR roflix_is_admin())) WITH CHECK (((id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "admin read active sessions" ON public.roflix_active_sessions AS permissive FOR SELECT TO authenticated USING (roflix_is_admin());
CREATE POLICY "admin read audit logs" ON public.roflix_admin_audit_logs AS permissive FOR SELECT TO authenticated USING (roflix_is_admin());
CREATE POLICY roflix_admin_control_events_admin_select ON public.roflix_admin_control_events AS permissive FOR SELECT TO authenticated USING (roflix_is_admin());
CREATE POLICY roflix_admin_feature_flags_admin_select ON public.roflix_admin_feature_flags AS permissive FOR SELECT TO authenticated USING (roflix_is_admin());
CREATE POLICY roflix_custom_movies_public_read ON public.roflix_custom_movies AS permissive FOR SELECT TO anon,authenticated USING (((published = true) OR ( SELECT roflix_is_admin() AS roflix_is_admin)));
CREATE POLICY roflix_favorites_delete_own ON public.roflix_favorites_cloud AS permissive FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY roflix_favorites_insert_own ON public.roflix_favorites_cloud AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY roflix_favorites_select_own ON public.roflix_favorites_cloud AS permissive FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "game stats own read" ON public.roflix_game_stats AS permissive FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "admin read gem transactions" ON public.roflix_gem_transactions AS permissive FOR SELECT TO authenticated USING (roflix_is_admin());
CREATE POLICY "roflix comment likes own delete" ON public.roflix_movie_comment_likes AS permissive FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "roflix comment likes own write" ON public.roflix_movie_comment_likes AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "roflix comment likes read" ON public.roflix_movie_comment_likes AS permissive FOR SELECT TO authenticated USING (true);
CREATE POLICY roflix_movie_comment_likes_delete ON public.roflix_movie_comment_likes AS permissive FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY roflix_movie_comment_likes_insert ON public.roflix_movie_comment_likes AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY roflix_movie_comment_likes_read ON public.roflix_movie_comment_likes AS permissive FOR SELECT TO public USING (true);
CREATE POLICY "roflix comment mod read" ON public.roflix_movie_comment_moderation AS permissive FOR SELECT TO authenticated USING (true);
CREATE POLICY roflix_movie_comment_moderation_admin ON public.roflix_movie_comment_moderation AS permissive FOR ALL TO authenticated USING (roflix_is_admin()) WITH CHECK (roflix_is_admin());
CREATE POLICY movie_comments_insert ON public.roflix_movie_comments AS permissive FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY movie_comments_read ON public.roflix_movie_comments AS permissive FOR SELECT TO public USING (true);
CREATE POLICY "roflix comments own delete" ON public.roflix_movie_comments AS permissive FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "roflix comments own insert" ON public.roflix_movie_comments AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "roflix comments own update" ON public.roflix_movie_comments AS permissive FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin())) WITH CHECK (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "roflix comments public read" ON public.roflix_movie_comments AS permissive FOR SELECT TO anon,authenticated USING (((COALESCE(status, 'visible'::text) = 'visible'::text) OR (user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY roflix_movie_curation_public_read ON public.roflix_movie_curation AS permissive FOR SELECT TO public USING (true);
CREATE POLICY roflix_movie_overrides_public_read ON public.roflix_movie_overrides AS permissive FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY roflix_movie_settings_public_read ON public.roflix_movie_settings AS permissive FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "release schedule admin delete" ON public.roflix_release_schedule AS permissive FOR DELETE TO authenticated USING (roflix_is_admin());
CREATE POLICY "release schedule admin insert" ON public.roflix_release_schedule AS permissive FOR INSERT TO authenticated WITH CHECK ((roflix_is_admin() AND (created_by = auth.uid())));
CREATE POLICY "release schedule admin update" ON public.roflix_release_schedule AS permissive FOR UPDATE TO authenticated USING (roflix_is_admin()) WITH CHECK (roflix_is_admin());
CREATE POLICY "release schedule public read" ON public.roflix_release_schedule AS permissive FOR SELECT TO anon,authenticated USING (((status = ANY (ARRAY['scheduled'::text, 'released'::text])) OR roflix_is_admin()));
CREATE POLICY "reports admin manage" ON public.roflix_reports AS permissive FOR UPDATE TO authenticated USING (roflix_is_admin()) WITH CHECK (roflix_is_admin());
CREATE POLICY "reports own insert" ON public.roflix_reports AS permissive FOR INSERT TO authenticated WITH CHECK ((reporter_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "reports own read" ON public.roflix_reports AS permissive FOR SELECT TO authenticated USING (((reporter_id = ( SELECT auth.uid() AS uid)) OR roflix_is_admin()));
CREATE POLICY "admin read analytics events" ON public.roflix_site_events AS permissive FOR SELECT TO authenticated USING (roflix_is_admin());
CREATE POLICY roflix_sync_fingerprints_self ON public.roflix_sync_fingerprints AS permissive FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY roflix_tv_featured_public_read ON public.roflix_tv_featured AS permissive FOR SELECT TO public USING ((enabled = true));
CREATE POLICY roflix_tv_settings_public_read ON public.roflix_tv_settings AS permissive FOR SELECT TO public USING (true);
CREATE POLICY "watch history own delete" ON public.roflix_watch_history AS permissive FOR DELETE TO public USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "watch history own insert" ON public.roflix_watch_history AS permissive FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "watch history own read" ON public.roflix_watch_history AS permissive FOR SELECT TO public USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "watch history own update" ON public.roflix_watch_history AS permissive FOR UPDATE TO public USING (((user_id = auth.uid()) OR roflix_is_admin())) WITH CHECK (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "watchlist own delete" ON public.roflix_watchlist AS permissive FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY "watchlist own insert" ON public.roflix_watchlist AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "watchlist own read" ON public.roflix_watchlist AS permissive FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR roflix_is_admin()));
CREATE POLICY rohub_published_themes_admin_delete ON public.rohub_published_themes AS permissive FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))));
CREATE POLICY rohub_published_themes_admin_insert ON public.rohub_published_themes AS permissive FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))) AND ((published_by IS NULL) OR (published_by = auth.uid()))));
CREATE POLICY rohub_published_themes_admin_update ON public.rohub_published_themes AS permissive FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))) AND ((published_by IS NULL) OR (published_by = auth.uid()))));
CREATE POLICY rohub_published_themes_public_read ON public.rohub_published_themes AS permissive FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY rohub_template_revisions_admin_insert ON public.rohub_template_revisions AS permissive FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))) AND ((created_by IS NULL) OR (created_by = auth.uid()))));
CREATE POLICY rohub_template_revisions_admin_select ON public.rohub_template_revisions AS permissive FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))));
CREATE POLICY rohub_templates_admin_delete ON public.rohub_templates AS permissive FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))));
CREATE POLICY rohub_templates_admin_insert ON public.rohub_templates AS permissive FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))) AND ((created_by IS NULL) OR (created_by = auth.uid())) AND ((updated_by IS NULL) OR (updated_by = auth.uid()))));
CREATE POLICY rohub_templates_admin_select ON public.rohub_templates AS permissive FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))));
CREATE POLICY rohub_templates_admin_update ON public.rohub_templates AS permissive FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))) AND ((updated_by IS NULL) OR (updated_by = auth.uid()))));
CREATE POLICY "Active admins write RoTruyen audit logs" ON public.rotruyen_audit_logs AS permissive FOR INSERT TO authenticated WITH CHECK (((actor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))));
CREATE POLICY "Only active admins read RoTruyen audit logs" ON public.rotruyen_audit_logs AS permissive FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))));
CREATE POLICY "Active admins manage RoTruyen chapters" ON public.rotruyen_chapters AS permissive FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))));
CREATE POLICY "Members can delete own unpublished RoTruyen chapters" ON public.rotruyen_chapters AS permissive FOR DELETE TO authenticated USING (((is_published = false) AND (EXISTS ( SELECT 1
   FROM rotruyen_series s
  WHERE ((s.id = rotruyen_chapters.series_id) AND (s.created_by = auth.uid()))))));
CREATE POLICY "Members can read own unlocked RoTruyen chapters" ON public.rotruyen_chapters AS permissive FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM rotruyen_series s
  WHERE ((s.id = rotruyen_chapters.series_id) AND (s.created_by = auth.uid()) AND (NOT s.is_locked)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))));
CREATE POLICY "Members can submit chapters to own RoTruyen series" ON public.rotruyen_chapters AS permissive FOR INSERT TO authenticated WITH CHECK (((is_published = false) AND (EXISTS ( SELECT 1
   FROM rotruyen_series s
  WHERE ((s.id = rotruyen_chapters.series_id) AND (s.created_by = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))));
CREATE POLICY "Members can update own unpublished RoTruyen chapters" ON public.rotruyen_chapters AS permissive FOR UPDATE TO authenticated USING (((is_published = false) AND (EXISTS ( SELECT 1
   FROM rotruyen_series s
  WHERE ((s.id = rotruyen_chapters.series_id) AND (s.created_by = auth.uid())))))) WITH CHECK (((is_published = false) AND (EXISTS ( SELECT 1
   FROM rotruyen_series s
  WHERE ((s.id = rotruyen_chapters.series_id) AND (s.created_by = auth.uid()))))));
CREATE POLICY "Public can read published unlocked RoTruyen chapters" ON public.rotruyen_chapters AS permissive FOR SELECT TO anon,authenticated USING (((is_published AND (EXISTS ( SELECT 1
   FROM rotruyen_series s
  WHERE ((s.id = rotruyen_chapters.series_id) AND s.is_published AND (NOT s.is_locked) AND ((s.content_rating <> 'erotica'::text) OR (auth.uid() IS NOT NULL)))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))));
CREATE POLICY "rotruyen genres admin write" ON public.rotruyen_genres AS permissive FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.account_status = 'active'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.account_status = 'active'::text)))));
CREATE POLICY "rotruyen genres public read" ON public.rotruyen_genres AS permissive FOR SELECT TO anon,authenticated USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.account_status = 'active'::text))))));
CREATE POLICY "Active admins manage RoTruyen series" ON public.rotruyen_series AS permissive FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))));
CREATE POLICY "Members can delete own unpublished RoTruyen series" ON public.rotruyen_series AS permissive FOR DELETE TO authenticated USING (((created_by = auth.uid()) AND (is_published = false)));
CREATE POLICY "Members can read own RoTruyen series" ON public.rotruyen_series AS permissive FOR SELECT TO authenticated USING (((created_by = auth.uid()) OR (is_published AND ((content_rating <> 'erotica'::text) OR (auth.uid() IS NOT NULL))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))));
CREATE POLICY "Members can submit own RoTruyen series" ON public.rotruyen_series AS permissive FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) AND (is_published = false) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))));
CREATE POLICY "Members can update own unpublished RoTruyen series" ON public.rotruyen_series AS permissive FOR UPDATE TO authenticated USING (((created_by = auth.uid()) AND (is_published = false))) WITH CHECK (((created_by = auth.uid()) AND (is_published = false)));
CREATE POLICY "Public can read published RoTruyen series" ON public.rotruyen_series AS permissive FOR SELECT TO anon,authenticated USING (((is_published AND ((content_rating <> 'erotica'::text) OR (auth.uid() IS NOT NULL))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))));
CREATE POLICY "Active admins manage RoTruyen settings" ON public.rotruyen_settings AS permissive FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text)))));
CREATE POLICY "Public can read RoTruyen public settings" ON public.rotruyen_settings AS permissive FOR SELECT TO anon,authenticated USING (((key ~~ 'public.%'::text) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (COALESCE(p.account_status, 'active'::text) = 'active'::text))))));
CREATE POLICY "Users manage own RoTruyen library" ON public.rotruyen_user_library AS permissive FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "events insert room members" ON public.watch_room_events AS permissive FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM watch_rooms r
  WHERE ((r.id = watch_room_events.room_id) AND ((r.host_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM watch_room_members m
          WHERE ((m.room_id = r.id) AND (m.user_id = auth.uid()))))))))));
CREATE POLICY "events read room members" ON public.watch_room_events AS permissive FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM watch_rooms r
  WHERE ((r.id = watch_room_events.room_id) AND ((r.host_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM watch_room_members m
          WHERE ((m.room_id = r.id) AND (m.user_id = auth.uid())))))))));
CREATE POLICY "members delete self" ON public.watch_room_members AS permissive FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "members insert self" ON public.watch_room_members AS permissive FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "members read room" ON public.watch_room_members AS permissive FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM watch_rooms r
  WHERE ((r.id = watch_room_members.room_id) AND (r.host_id = auth.uid()))))));
CREATE POLICY "rooms create own" ON public.watch_rooms AS permissive FOR INSERT TO authenticated WITH CHECK ((host_id = auth.uid()));
CREATE POLICY "rooms read host or member" ON public.watch_rooms AS permissive FOR SELECT TO authenticated USING (((host_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM watch_room_members m
  WHERE ((m.room_id = watch_rooms.id) AND (m.user_id = auth.uid()))))));
CREATE POLICY "rooms update host" ON public.watch_rooms AS permissive FOR UPDATE TO authenticated USING ((host_id = auth.uid())) WITH CHECK ((host_id = auth.uid()));
CREATE POLICY "Active RoHub admins can delete RoTruyen images" ON storage.objects AS permissive FOR DELETE TO authenticated USING (((bucket_id = 'rotruyen-pages'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text) AND ((p.account_status IS NULL) OR (p.account_status = 'active'::text)))))));
CREATE POLICY "Active RoHub admins can update RoTruyen images" ON storage.objects AS permissive FOR UPDATE TO authenticated USING (((bucket_id = 'rotruyen-pages'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text) AND ((p.account_status IS NULL) OR (p.account_status = 'active'::text))))))) WITH CHECK (((bucket_id = 'rotruyen-pages'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text) AND ((p.account_status IS NULL) OR (p.account_status = 'active'::text)))))));
CREATE POLICY "Active RoHub admins can upload RoTruyen images" ON storage.objects AS permissive FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'rotruyen-pages'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text) AND ((p.account_status IS NULL) OR (p.account_status = 'active'::text)))))));
CREATE POLICY "RoTruyen chapter images are publicly readable" ON storage.objects AS permissive FOR SELECT TO anon,authenticated USING ((bucket_id = 'rotruyen-pages'::text));
CREATE POLICY "roflix gacha admin delete" ON storage.objects AS permissive FOR DELETE TO authenticated USING (((bucket_id = 'roflix-gacha'::text) AND roflix_is_admin()));
CREATE POLICY "roflix gacha admin update" ON storage.objects AS permissive FOR UPDATE TO authenticated USING (((bucket_id = 'roflix-gacha'::text) AND roflix_is_admin())) WITH CHECK (((bucket_id = 'roflix-gacha'::text) AND roflix_is_admin()));
CREATE POLICY "roflix gacha admin upload" ON storage.objects AS permissive FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'roflix-gacha'::text) AND roflix_is_admin()));
CREATE POLICY "roflix gacha public read" ON storage.objects AS permissive FOR SELECT TO public USING ((bucket_id = 'roflix-gacha'::text));
CREATE POLICY "roflix profile own delete" ON storage.objects AS permissive FOR DELETE TO authenticated USING (((bucket_id = 'roflix-profile'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "roflix profile own update" ON storage.objects AS permissive FOR UPDATE TO authenticated USING (((bucket_id = 'roflix-profile'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) WITH CHECK (((bucket_id = 'roflix-profile'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "roflix profile own upload" ON storage.objects AS permissive FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'roflix-profile'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "roflix profile public read" ON storage.objects AS permissive FOR SELECT TO public USING ((bucket_id = 'roflix-profile'::text));
CREATE POLICY roflix_media_admin_delete ON storage.objects AS permissive FOR DELETE TO authenticated USING (((bucket_id = 'roflix-media'::text) AND ( SELECT roflix_is_admin() AS roflix_is_admin)));
CREATE POLICY roflix_media_admin_insert ON storage.objects AS permissive FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'roflix-media'::text) AND ( SELECT roflix_is_admin() AS roflix_is_admin)));
CREATE POLICY roflix_media_admin_select ON storage.objects AS permissive FOR SELECT TO authenticated USING (((bucket_id = 'roflix-media'::text) AND ( SELECT roflix_is_admin() AS roflix_is_admin)));
CREATE POLICY roflix_media_admin_update ON storage.objects AS permissive FOR UPDATE TO authenticated USING (((bucket_id = 'roflix-media'::text) AND ( SELECT roflix_is_admin() AS roflix_is_admin))) WITH CHECK (((bucket_id = 'roflix-media'::text) AND ( SELECT roflix_is_admin() AS roflix_is_admin)));
CREATE POLICY roflix_media_auth_read ON storage.objects AS permissive FOR SELECT TO authenticated USING (((bucket_id = 'roflix-media'::text) AND (auth.uid() IS NOT NULL)));

-- 8. Triggers
CREATE TRIGGER roflix_comment_notification AFTER INSERT ON community_comments FOR EACH ROW EXECUTE FUNCTION roflix_notify_comment();
CREATE TRIGGER roflix_like_notification AFTER INSERT ON community_likes FOR EACH ROW EXECUTE FUNCTION roflix_notify_like();
CREATE TRIGGER roflix_movie_comment_audit AFTER DELETE OR UPDATE ON movie_comments FOR EACH ROW EXECUTE FUNCTION roflix_movie_comment_audit();
CREATE TRIGGER roflix_profile_role_guard BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION roflix_protect_profile_role();
CREATE TRIGGER roflix_release_schedule_audit AFTER INSERT OR DELETE OR UPDATE ON roflix_release_schedule FOR EACH ROW EXECUTE FUNCTION roflix_release_schedule_audit();
CREATE TRIGGER roflix_release_schedule_touch BEFORE UPDATE ON roflix_release_schedule FOR EACH ROW EXECUTE FUNCTION roflix_release_schedule_touch();
CREATE TRIGGER roh_templates_touch_updated_at BEFORE INSERT OR UPDATE ON rohub_templates FOR EACH ROW EXECUTE FUNCTION rohub_templates_touch_updated_at();
CREATE TRIGGER rotruyen_chapters_touch BEFORE UPDATE ON rotruyen_chapters FOR EACH ROW EXECUTE FUNCTION rotruyen_touch_updated_at();
CREATE TRIGGER rotruyen_series_touch BEFORE UPDATE ON rotruyen_series FOR EACH ROW EXECUTE FUNCTION rotruyen_touch_updated_at();
CREATE TRIGGER rotruyen_settings_touch BEFORE UPDATE ON rotruyen_settings FOR EACH ROW EXECUTE FUNCTION rotruyen_touch_updated_at();
CREATE TRIGGER rotruyen_user_library_touch BEFORE UPDATE ON rotruyen_user_library FOR EACH ROW EXECUTE FUNCTION rotruyen_library_touch_updated_at();
CREATE TRIGGER roflix_watch_rooms_touch BEFORE UPDATE ON watch_rooms FOR EACH ROW EXECUTE FUNCTION roflix_touch_updated_at();

-- 9. Table and sequence grants
REVOKE ALL ON TABLE public.community_comments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.community_likes FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.community_posts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.movie_comments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.movie_comments_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_active_sessions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_admin_audit_logs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.roflix_admin_audit_logs_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_admin_control_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.roflix_admin_control_events_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_admin_feature_flags FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_custom_movies FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_favorites_cloud FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_game_stats FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_gem_transactions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.roflix_gem_transactions_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_movie_comment_likes FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_movie_comment_moderation FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_movie_comments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_movie_curation FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_movie_overrides FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_movie_settings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_release_schedule FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_reports FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_site_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.roflix_site_events_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_sync_fingerprints FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_tv_featured FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_tv_settings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_watch_history FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_watch_metrics FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_watch_reward_claims FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.roflix_watch_reward_claims_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.roflix_watchlist FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.roflix_watchlist_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rohub_published_themes FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rohub_template_revisions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rohub_templates FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rotruyen_audit_logs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.rotruyen_audit_logs_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rotruyen_chapters FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rotruyen_genres FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rotruyen_series FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rotruyen_settings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.rotruyen_user_library FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.watch_room_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.watch_room_events_id_seq FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.watch_room_members FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.watch_rooms FROM PUBLIC, anon, authenticated, service_role;
GRANT DELETE ON TABLE public.community_comments TO anon;
GRANT DELETE ON TABLE public.community_comments TO authenticated;
GRANT DELETE ON TABLE public.community_comments TO service_role;
GRANT INSERT ON TABLE public.community_comments TO anon;
GRANT INSERT ON TABLE public.community_comments TO authenticated;
GRANT INSERT ON TABLE public.community_comments TO service_role;
GRANT MAINTAIN ON TABLE public.community_comments TO anon;
GRANT MAINTAIN ON TABLE public.community_comments TO authenticated;
GRANT MAINTAIN ON TABLE public.community_comments TO service_role;
GRANT REFERENCES ON TABLE public.community_comments TO anon;
GRANT REFERENCES ON TABLE public.community_comments TO authenticated;
GRANT REFERENCES ON TABLE public.community_comments TO service_role;
GRANT SELECT ON TABLE public.community_comments TO anon;
GRANT SELECT ON TABLE public.community_comments TO authenticated;
GRANT SELECT ON TABLE public.community_comments TO service_role;
GRANT TRIGGER ON TABLE public.community_comments TO anon;
GRANT TRIGGER ON TABLE public.community_comments TO authenticated;
GRANT TRIGGER ON TABLE public.community_comments TO service_role;
GRANT TRUNCATE ON TABLE public.community_comments TO anon;
GRANT TRUNCATE ON TABLE public.community_comments TO authenticated;
GRANT TRUNCATE ON TABLE public.community_comments TO service_role;
GRANT UPDATE ON TABLE public.community_comments TO anon;
GRANT UPDATE ON TABLE public.community_comments TO authenticated;
GRANT UPDATE ON TABLE public.community_comments TO service_role;
GRANT DELETE ON TABLE public.community_likes TO anon;
GRANT DELETE ON TABLE public.community_likes TO authenticated;
GRANT DELETE ON TABLE public.community_likes TO service_role;
GRANT INSERT ON TABLE public.community_likes TO anon;
GRANT INSERT ON TABLE public.community_likes TO authenticated;
GRANT INSERT ON TABLE public.community_likes TO service_role;
GRANT MAINTAIN ON TABLE public.community_likes TO anon;
GRANT MAINTAIN ON TABLE public.community_likes TO authenticated;
GRANT MAINTAIN ON TABLE public.community_likes TO service_role;
GRANT REFERENCES ON TABLE public.community_likes TO anon;
GRANT REFERENCES ON TABLE public.community_likes TO authenticated;
GRANT REFERENCES ON TABLE public.community_likes TO service_role;
GRANT SELECT ON TABLE public.community_likes TO anon;
GRANT SELECT ON TABLE public.community_likes TO authenticated;
GRANT SELECT ON TABLE public.community_likes TO service_role;
GRANT TRIGGER ON TABLE public.community_likes TO anon;
GRANT TRIGGER ON TABLE public.community_likes TO authenticated;
GRANT TRIGGER ON TABLE public.community_likes TO service_role;
GRANT TRUNCATE ON TABLE public.community_likes TO anon;
GRANT TRUNCATE ON TABLE public.community_likes TO authenticated;
GRANT TRUNCATE ON TABLE public.community_likes TO service_role;
GRANT UPDATE ON TABLE public.community_likes TO anon;
GRANT UPDATE ON TABLE public.community_likes TO authenticated;
GRANT UPDATE ON TABLE public.community_likes TO service_role;
GRANT DELETE ON TABLE public.community_posts TO anon;
GRANT DELETE ON TABLE public.community_posts TO authenticated;
GRANT DELETE ON TABLE public.community_posts TO service_role;
GRANT INSERT ON TABLE public.community_posts TO anon;
GRANT INSERT ON TABLE public.community_posts TO authenticated;
GRANT INSERT ON TABLE public.community_posts TO service_role;
GRANT MAINTAIN ON TABLE public.community_posts TO anon;
GRANT MAINTAIN ON TABLE public.community_posts TO authenticated;
GRANT MAINTAIN ON TABLE public.community_posts TO service_role;
GRANT REFERENCES ON TABLE public.community_posts TO anon;
GRANT REFERENCES ON TABLE public.community_posts TO authenticated;
GRANT REFERENCES ON TABLE public.community_posts TO service_role;
GRANT SELECT ON TABLE public.community_posts TO anon;
GRANT SELECT ON TABLE public.community_posts TO authenticated;
GRANT SELECT ON TABLE public.community_posts TO service_role;
GRANT TRIGGER ON TABLE public.community_posts TO anon;
GRANT TRIGGER ON TABLE public.community_posts TO authenticated;
GRANT TRIGGER ON TABLE public.community_posts TO service_role;
GRANT TRUNCATE ON TABLE public.community_posts TO anon;
GRANT TRUNCATE ON TABLE public.community_posts TO authenticated;
GRANT TRUNCATE ON TABLE public.community_posts TO service_role;
GRANT UPDATE ON TABLE public.community_posts TO anon;
GRANT UPDATE ON TABLE public.community_posts TO authenticated;
GRANT UPDATE ON TABLE public.community_posts TO service_role;
GRANT DELETE ON TABLE public.movie_comments TO anon;
GRANT DELETE ON TABLE public.movie_comments TO authenticated;
GRANT DELETE ON TABLE public.movie_comments TO service_role;
GRANT INSERT ON TABLE public.movie_comments TO anon;
GRANT INSERT ON TABLE public.movie_comments TO authenticated;
GRANT INSERT ON TABLE public.movie_comments TO service_role;
GRANT MAINTAIN ON TABLE public.movie_comments TO anon;
GRANT MAINTAIN ON TABLE public.movie_comments TO authenticated;
GRANT MAINTAIN ON TABLE public.movie_comments TO service_role;
GRANT REFERENCES ON TABLE public.movie_comments TO anon;
GRANT REFERENCES ON TABLE public.movie_comments TO authenticated;
GRANT REFERENCES ON TABLE public.movie_comments TO service_role;
GRANT SELECT ON TABLE public.movie_comments TO anon;
GRANT SELECT ON TABLE public.movie_comments TO authenticated;
GRANT SELECT ON TABLE public.movie_comments TO service_role;
GRANT TRIGGER ON TABLE public.movie_comments TO anon;
GRANT TRIGGER ON TABLE public.movie_comments TO authenticated;
GRANT TRIGGER ON TABLE public.movie_comments TO service_role;
GRANT TRUNCATE ON TABLE public.movie_comments TO anon;
GRANT TRUNCATE ON TABLE public.movie_comments TO authenticated;
GRANT TRUNCATE ON TABLE public.movie_comments TO service_role;
GRANT UPDATE ON TABLE public.movie_comments TO anon;
GRANT UPDATE ON TABLE public.movie_comments TO authenticated;
GRANT UPDATE ON TABLE public.movie_comments TO service_role;
GRANT SELECT ON SEQUENCE public.movie_comments_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.movie_comments_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.movie_comments_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.movie_comments_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.movie_comments_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.movie_comments_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.movie_comments_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.movie_comments_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.movie_comments_id_seq TO service_role;
GRANT DELETE ON TABLE public.notifications TO anon;
GRANT DELETE ON TABLE public.notifications TO authenticated;
GRANT DELETE ON TABLE public.notifications TO service_role;
GRANT INSERT ON TABLE public.notifications TO anon;
GRANT INSERT ON TABLE public.notifications TO authenticated;
GRANT INSERT ON TABLE public.notifications TO service_role;
GRANT MAINTAIN ON TABLE public.notifications TO anon;
GRANT MAINTAIN ON TABLE public.notifications TO authenticated;
GRANT MAINTAIN ON TABLE public.notifications TO service_role;
GRANT REFERENCES ON TABLE public.notifications TO anon;
GRANT REFERENCES ON TABLE public.notifications TO authenticated;
GRANT REFERENCES ON TABLE public.notifications TO service_role;
GRANT SELECT ON TABLE public.notifications TO anon;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT SELECT ON TABLE public.notifications TO service_role;
GRANT TRIGGER ON TABLE public.notifications TO anon;
GRANT TRIGGER ON TABLE public.notifications TO authenticated;
GRANT TRIGGER ON TABLE public.notifications TO service_role;
GRANT TRUNCATE ON TABLE public.notifications TO anon;
GRANT TRUNCATE ON TABLE public.notifications TO authenticated;
GRANT TRUNCATE ON TABLE public.notifications TO service_role;
GRANT UPDATE ON TABLE public.notifications TO anon;
GRANT UPDATE ON TABLE public.notifications TO authenticated;
GRANT UPDATE ON TABLE public.notifications TO service_role;
GRANT DELETE ON TABLE public.profiles TO anon;
GRANT DELETE ON TABLE public.profiles TO authenticated;
GRANT DELETE ON TABLE public.profiles TO service_role;
GRANT INSERT ON TABLE public.profiles TO anon;
GRANT INSERT ON TABLE public.profiles TO authenticated;
GRANT INSERT ON TABLE public.profiles TO service_role;
GRANT MAINTAIN ON TABLE public.profiles TO anon;
GRANT MAINTAIN ON TABLE public.profiles TO authenticated;
GRANT MAINTAIN ON TABLE public.profiles TO service_role;
GRANT REFERENCES ON TABLE public.profiles TO anon;
GRANT REFERENCES ON TABLE public.profiles TO authenticated;
GRANT REFERENCES ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO service_role;
GRANT TRIGGER ON TABLE public.profiles TO anon;
GRANT TRIGGER ON TABLE public.profiles TO authenticated;
GRANT TRIGGER ON TABLE public.profiles TO service_role;
GRANT TRUNCATE ON TABLE public.profiles TO anon;
GRANT TRUNCATE ON TABLE public.profiles TO authenticated;
GRANT TRUNCATE ON TABLE public.profiles TO service_role;
GRANT UPDATE ON TABLE public.profiles TO anon;
GRANT UPDATE ON TABLE public.profiles TO authenticated;
GRANT UPDATE ON TABLE public.profiles TO service_role;
GRANT DELETE ON TABLE public.roflix_active_sessions TO service_role;
GRANT INSERT ON TABLE public.roflix_active_sessions TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_active_sessions TO service_role;
GRANT REFERENCES ON TABLE public.roflix_active_sessions TO service_role;
GRANT SELECT ON TABLE public.roflix_active_sessions TO authenticated;
GRANT SELECT ON TABLE public.roflix_active_sessions TO service_role;
GRANT TRIGGER ON TABLE public.roflix_active_sessions TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_active_sessions TO service_role;
GRANT UPDATE ON TABLE public.roflix_active_sessions TO service_role;
GRANT DELETE ON TABLE public.roflix_admin_audit_logs TO service_role;
GRANT INSERT ON TABLE public.roflix_admin_audit_logs TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_admin_audit_logs TO service_role;
GRANT REFERENCES ON TABLE public.roflix_admin_audit_logs TO service_role;
GRANT SELECT ON TABLE public.roflix_admin_audit_logs TO authenticated;
GRANT SELECT ON TABLE public.roflix_admin_audit_logs TO service_role;
GRANT TRIGGER ON TABLE public.roflix_admin_audit_logs TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_admin_audit_logs TO service_role;
GRANT UPDATE ON TABLE public.roflix_admin_audit_logs TO service_role;
GRANT SELECT ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.roflix_admin_audit_logs_id_seq TO service_role;
GRANT DELETE ON TABLE public.roflix_admin_control_events TO anon;
GRANT DELETE ON TABLE public.roflix_admin_control_events TO authenticated;
GRANT DELETE ON TABLE public.roflix_admin_control_events TO service_role;
GRANT INSERT ON TABLE public.roflix_admin_control_events TO anon;
GRANT INSERT ON TABLE public.roflix_admin_control_events TO authenticated;
GRANT INSERT ON TABLE public.roflix_admin_control_events TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_admin_control_events TO anon;
GRANT MAINTAIN ON TABLE public.roflix_admin_control_events TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_admin_control_events TO service_role;
GRANT REFERENCES ON TABLE public.roflix_admin_control_events TO anon;
GRANT REFERENCES ON TABLE public.roflix_admin_control_events TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_admin_control_events TO service_role;
GRANT SELECT ON TABLE public.roflix_admin_control_events TO anon;
GRANT SELECT ON TABLE public.roflix_admin_control_events TO authenticated;
GRANT SELECT ON TABLE public.roflix_admin_control_events TO service_role;
GRANT TRIGGER ON TABLE public.roflix_admin_control_events TO anon;
GRANT TRIGGER ON TABLE public.roflix_admin_control_events TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_admin_control_events TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_admin_control_events TO anon;
GRANT TRUNCATE ON TABLE public.roflix_admin_control_events TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_admin_control_events TO service_role;
GRANT UPDATE ON TABLE public.roflix_admin_control_events TO anon;
GRANT UPDATE ON TABLE public.roflix_admin_control_events TO authenticated;
GRANT UPDATE ON TABLE public.roflix_admin_control_events TO service_role;
GRANT SELECT ON SEQUENCE public.roflix_admin_control_events_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.roflix_admin_control_events_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.roflix_admin_control_events_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.roflix_admin_control_events_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.roflix_admin_control_events_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.roflix_admin_control_events_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.roflix_admin_control_events_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.roflix_admin_control_events_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.roflix_admin_control_events_id_seq TO service_role;
GRANT DELETE ON TABLE public.roflix_admin_feature_flags TO anon;
GRANT DELETE ON TABLE public.roflix_admin_feature_flags TO authenticated;
GRANT DELETE ON TABLE public.roflix_admin_feature_flags TO service_role;
GRANT INSERT ON TABLE public.roflix_admin_feature_flags TO anon;
GRANT INSERT ON TABLE public.roflix_admin_feature_flags TO authenticated;
GRANT INSERT ON TABLE public.roflix_admin_feature_flags TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_admin_feature_flags TO anon;
GRANT MAINTAIN ON TABLE public.roflix_admin_feature_flags TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_admin_feature_flags TO service_role;
GRANT REFERENCES ON TABLE public.roflix_admin_feature_flags TO anon;
GRANT REFERENCES ON TABLE public.roflix_admin_feature_flags TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_admin_feature_flags TO service_role;
GRANT SELECT ON TABLE public.roflix_admin_feature_flags TO anon;
GRANT SELECT ON TABLE public.roflix_admin_feature_flags TO authenticated;
GRANT SELECT ON TABLE public.roflix_admin_feature_flags TO service_role;
GRANT TRIGGER ON TABLE public.roflix_admin_feature_flags TO anon;
GRANT TRIGGER ON TABLE public.roflix_admin_feature_flags TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_admin_feature_flags TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_admin_feature_flags TO anon;
GRANT TRUNCATE ON TABLE public.roflix_admin_feature_flags TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_admin_feature_flags TO service_role;
GRANT UPDATE ON TABLE public.roflix_admin_feature_flags TO anon;
GRANT UPDATE ON TABLE public.roflix_admin_feature_flags TO authenticated;
GRANT UPDATE ON TABLE public.roflix_admin_feature_flags TO service_role;
GRANT DELETE ON TABLE public.roflix_custom_movies TO service_role;
GRANT INSERT ON TABLE public.roflix_custom_movies TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_custom_movies TO service_role;
GRANT REFERENCES ON TABLE public.roflix_custom_movies TO service_role;
GRANT SELECT ON TABLE public.roflix_custom_movies TO anon;
GRANT SELECT ON TABLE public.roflix_custom_movies TO authenticated;
GRANT SELECT ON TABLE public.roflix_custom_movies TO service_role;
GRANT TRIGGER ON TABLE public.roflix_custom_movies TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_custom_movies TO service_role;
GRANT UPDATE ON TABLE public.roflix_custom_movies TO service_role;
GRANT DELETE ON TABLE public.roflix_favorites_cloud TO anon;
GRANT DELETE ON TABLE public.roflix_favorites_cloud TO authenticated;
GRANT DELETE ON TABLE public.roflix_favorites_cloud TO service_role;
GRANT INSERT ON TABLE public.roflix_favorites_cloud TO anon;
GRANT INSERT ON TABLE public.roflix_favorites_cloud TO authenticated;
GRANT INSERT ON TABLE public.roflix_favorites_cloud TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_favorites_cloud TO anon;
GRANT MAINTAIN ON TABLE public.roflix_favorites_cloud TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_favorites_cloud TO service_role;
GRANT REFERENCES ON TABLE public.roflix_favorites_cloud TO anon;
GRANT REFERENCES ON TABLE public.roflix_favorites_cloud TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_favorites_cloud TO service_role;
GRANT SELECT ON TABLE public.roflix_favorites_cloud TO anon;
GRANT SELECT ON TABLE public.roflix_favorites_cloud TO authenticated;
GRANT SELECT ON TABLE public.roflix_favorites_cloud TO service_role;
GRANT TRIGGER ON TABLE public.roflix_favorites_cloud TO anon;
GRANT TRIGGER ON TABLE public.roflix_favorites_cloud TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_favorites_cloud TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_favorites_cloud TO anon;
GRANT TRUNCATE ON TABLE public.roflix_favorites_cloud TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_favorites_cloud TO service_role;
GRANT UPDATE ON TABLE public.roflix_favorites_cloud TO anon;
GRANT UPDATE ON TABLE public.roflix_favorites_cloud TO authenticated;
GRANT UPDATE ON TABLE public.roflix_favorites_cloud TO service_role;
GRANT DELETE ON TABLE public.roflix_game_stats TO service_role;
GRANT INSERT ON TABLE public.roflix_game_stats TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_game_stats TO service_role;
GRANT REFERENCES ON TABLE public.roflix_game_stats TO service_role;
GRANT SELECT ON TABLE public.roflix_game_stats TO authenticated;
GRANT SELECT ON TABLE public.roflix_game_stats TO service_role;
GRANT TRIGGER ON TABLE public.roflix_game_stats TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_game_stats TO service_role;
GRANT UPDATE ON TABLE public.roflix_game_stats TO service_role;
GRANT DELETE ON TABLE public.roflix_gem_transactions TO service_role;
GRANT INSERT ON TABLE public.roflix_gem_transactions TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_gem_transactions TO service_role;
GRANT REFERENCES ON TABLE public.roflix_gem_transactions TO service_role;
GRANT SELECT ON TABLE public.roflix_gem_transactions TO authenticated;
GRANT SELECT ON TABLE public.roflix_gem_transactions TO service_role;
GRANT TRIGGER ON TABLE public.roflix_gem_transactions TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_gem_transactions TO service_role;
GRANT UPDATE ON TABLE public.roflix_gem_transactions TO service_role;
GRANT SELECT ON SEQUENCE public.roflix_gem_transactions_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.roflix_gem_transactions_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.roflix_gem_transactions_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.roflix_gem_transactions_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.roflix_gem_transactions_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.roflix_gem_transactions_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.roflix_gem_transactions_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.roflix_gem_transactions_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.roflix_gem_transactions_id_seq TO service_role;
GRANT DELETE ON TABLE public.roflix_movie_comment_likes TO authenticated;
GRANT DELETE ON TABLE public.roflix_movie_comment_likes TO service_role;
GRANT INSERT ON TABLE public.roflix_movie_comment_likes TO authenticated;
GRANT INSERT ON TABLE public.roflix_movie_comment_likes TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_movie_comment_likes TO service_role;
GRANT REFERENCES ON TABLE public.roflix_movie_comment_likes TO service_role;
GRANT SELECT ON TABLE public.roflix_movie_comment_likes TO authenticated;
GRANT SELECT ON TABLE public.roflix_movie_comment_likes TO service_role;
GRANT TRIGGER ON TABLE public.roflix_movie_comment_likes TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_movie_comment_likes TO service_role;
GRANT UPDATE ON TABLE public.roflix_movie_comment_likes TO service_role;
GRANT DELETE ON TABLE public.roflix_movie_comment_moderation TO service_role;
GRANT INSERT ON TABLE public.roflix_movie_comment_moderation TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_movie_comment_moderation TO service_role;
GRANT REFERENCES ON TABLE public.roflix_movie_comment_moderation TO service_role;
GRANT SELECT ON TABLE public.roflix_movie_comment_moderation TO authenticated;
GRANT SELECT ON TABLE public.roflix_movie_comment_moderation TO service_role;
GRANT TRIGGER ON TABLE public.roflix_movie_comment_moderation TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_movie_comment_moderation TO service_role;
GRANT UPDATE ON TABLE public.roflix_movie_comment_moderation TO service_role;
GRANT DELETE ON TABLE public.roflix_movie_comments TO authenticated;
GRANT DELETE ON TABLE public.roflix_movie_comments TO service_role;
GRANT INSERT ON TABLE public.roflix_movie_comments TO authenticated;
GRANT INSERT ON TABLE public.roflix_movie_comments TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_movie_comments TO service_role;
GRANT REFERENCES ON TABLE public.roflix_movie_comments TO service_role;
GRANT SELECT ON TABLE public.roflix_movie_comments TO anon;
GRANT SELECT ON TABLE public.roflix_movie_comments TO authenticated;
GRANT SELECT ON TABLE public.roflix_movie_comments TO service_role;
GRANT TRIGGER ON TABLE public.roflix_movie_comments TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_movie_comments TO service_role;
GRANT UPDATE ON TABLE public.roflix_movie_comments TO authenticated;
GRANT UPDATE ON TABLE public.roflix_movie_comments TO service_role;
GRANT DELETE ON TABLE public.roflix_movie_curation TO anon;
GRANT DELETE ON TABLE public.roflix_movie_curation TO authenticated;
GRANT DELETE ON TABLE public.roflix_movie_curation TO service_role;
GRANT INSERT ON TABLE public.roflix_movie_curation TO anon;
GRANT INSERT ON TABLE public.roflix_movie_curation TO authenticated;
GRANT INSERT ON TABLE public.roflix_movie_curation TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_movie_curation TO anon;
GRANT MAINTAIN ON TABLE public.roflix_movie_curation TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_movie_curation TO service_role;
GRANT REFERENCES ON TABLE public.roflix_movie_curation TO anon;
GRANT REFERENCES ON TABLE public.roflix_movie_curation TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_movie_curation TO service_role;
GRANT SELECT ON TABLE public.roflix_movie_curation TO anon;
GRANT SELECT ON TABLE public.roflix_movie_curation TO authenticated;
GRANT SELECT ON TABLE public.roflix_movie_curation TO service_role;
GRANT TRIGGER ON TABLE public.roflix_movie_curation TO anon;
GRANT TRIGGER ON TABLE public.roflix_movie_curation TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_movie_curation TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_movie_curation TO anon;
GRANT TRUNCATE ON TABLE public.roflix_movie_curation TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_movie_curation TO service_role;
GRANT UPDATE ON TABLE public.roflix_movie_curation TO anon;
GRANT UPDATE ON TABLE public.roflix_movie_curation TO authenticated;
GRANT UPDATE ON TABLE public.roflix_movie_curation TO service_role;
GRANT DELETE ON TABLE public.roflix_movie_overrides TO service_role;
GRANT INSERT ON TABLE public.roflix_movie_overrides TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_movie_overrides TO service_role;
GRANT REFERENCES ON TABLE public.roflix_movie_overrides TO service_role;
GRANT SELECT ON TABLE public.roflix_movie_overrides TO anon;
GRANT SELECT ON TABLE public.roflix_movie_overrides TO authenticated;
GRANT SELECT ON TABLE public.roflix_movie_overrides TO service_role;
GRANT TRIGGER ON TABLE public.roflix_movie_overrides TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_movie_overrides TO service_role;
GRANT UPDATE ON TABLE public.roflix_movie_overrides TO service_role;
GRANT DELETE ON TABLE public.roflix_movie_settings TO service_role;
GRANT INSERT ON TABLE public.roflix_movie_settings TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_movie_settings TO service_role;
GRANT REFERENCES ON TABLE public.roflix_movie_settings TO service_role;
GRANT SELECT ON TABLE public.roflix_movie_settings TO anon;
GRANT SELECT ON TABLE public.roflix_movie_settings TO authenticated;
GRANT SELECT ON TABLE public.roflix_movie_settings TO service_role;
GRANT TRIGGER ON TABLE public.roflix_movie_settings TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_movie_settings TO service_role;
GRANT UPDATE ON TABLE public.roflix_movie_settings TO service_role;
GRANT DELETE ON TABLE public.roflix_release_schedule TO anon;
GRANT DELETE ON TABLE public.roflix_release_schedule TO authenticated;
GRANT DELETE ON TABLE public.roflix_release_schedule TO service_role;
GRANT INSERT ON TABLE public.roflix_release_schedule TO anon;
GRANT INSERT ON TABLE public.roflix_release_schedule TO authenticated;
GRANT INSERT ON TABLE public.roflix_release_schedule TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_release_schedule TO anon;
GRANT MAINTAIN ON TABLE public.roflix_release_schedule TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_release_schedule TO service_role;
GRANT REFERENCES ON TABLE public.roflix_release_schedule TO anon;
GRANT REFERENCES ON TABLE public.roflix_release_schedule TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_release_schedule TO service_role;
GRANT SELECT ON TABLE public.roflix_release_schedule TO anon;
GRANT SELECT ON TABLE public.roflix_release_schedule TO authenticated;
GRANT SELECT ON TABLE public.roflix_release_schedule TO service_role;
GRANT TRIGGER ON TABLE public.roflix_release_schedule TO anon;
GRANT TRIGGER ON TABLE public.roflix_release_schedule TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_release_schedule TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_release_schedule TO anon;
GRANT TRUNCATE ON TABLE public.roflix_release_schedule TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_release_schedule TO service_role;
GRANT UPDATE ON TABLE public.roflix_release_schedule TO anon;
GRANT UPDATE ON TABLE public.roflix_release_schedule TO authenticated;
GRANT UPDATE ON TABLE public.roflix_release_schedule TO service_role;
GRANT DELETE ON TABLE public.roflix_reports TO anon;
GRANT DELETE ON TABLE public.roflix_reports TO authenticated;
GRANT DELETE ON TABLE public.roflix_reports TO service_role;
GRANT INSERT ON TABLE public.roflix_reports TO anon;
GRANT INSERT ON TABLE public.roflix_reports TO authenticated;
GRANT INSERT ON TABLE public.roflix_reports TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_reports TO anon;
GRANT MAINTAIN ON TABLE public.roflix_reports TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_reports TO service_role;
GRANT REFERENCES ON TABLE public.roflix_reports TO anon;
GRANT REFERENCES ON TABLE public.roflix_reports TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_reports TO service_role;
GRANT SELECT ON TABLE public.roflix_reports TO anon;
GRANT SELECT ON TABLE public.roflix_reports TO authenticated;
GRANT SELECT ON TABLE public.roflix_reports TO service_role;
GRANT TRIGGER ON TABLE public.roflix_reports TO anon;
GRANT TRIGGER ON TABLE public.roflix_reports TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_reports TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_reports TO anon;
GRANT TRUNCATE ON TABLE public.roflix_reports TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_reports TO service_role;
GRANT UPDATE ON TABLE public.roflix_reports TO anon;
GRANT UPDATE ON TABLE public.roflix_reports TO authenticated;
GRANT UPDATE ON TABLE public.roflix_reports TO service_role;
GRANT DELETE ON TABLE public.roflix_site_events TO service_role;
GRANT INSERT ON TABLE public.roflix_site_events TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_site_events TO service_role;
GRANT REFERENCES ON TABLE public.roflix_site_events TO service_role;
GRANT SELECT ON TABLE public.roflix_site_events TO authenticated;
GRANT SELECT ON TABLE public.roflix_site_events TO service_role;
GRANT TRIGGER ON TABLE public.roflix_site_events TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_site_events TO service_role;
GRANT UPDATE ON TABLE public.roflix_site_events TO service_role;
GRANT SELECT ON SEQUENCE public.roflix_site_events_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.roflix_site_events_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.roflix_site_events_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.roflix_site_events_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.roflix_site_events_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.roflix_site_events_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.roflix_site_events_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.roflix_site_events_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.roflix_site_events_id_seq TO service_role;
GRANT DELETE ON TABLE public.roflix_sync_fingerprints TO anon;
GRANT DELETE ON TABLE public.roflix_sync_fingerprints TO authenticated;
GRANT DELETE ON TABLE public.roflix_sync_fingerprints TO service_role;
GRANT INSERT ON TABLE public.roflix_sync_fingerprints TO anon;
GRANT INSERT ON TABLE public.roflix_sync_fingerprints TO authenticated;
GRANT INSERT ON TABLE public.roflix_sync_fingerprints TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_sync_fingerprints TO anon;
GRANT MAINTAIN ON TABLE public.roflix_sync_fingerprints TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_sync_fingerprints TO service_role;
GRANT REFERENCES ON TABLE public.roflix_sync_fingerprints TO anon;
GRANT REFERENCES ON TABLE public.roflix_sync_fingerprints TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_sync_fingerprints TO service_role;
GRANT SELECT ON TABLE public.roflix_sync_fingerprints TO anon;
GRANT SELECT ON TABLE public.roflix_sync_fingerprints TO authenticated;
GRANT SELECT ON TABLE public.roflix_sync_fingerprints TO service_role;
GRANT TRIGGER ON TABLE public.roflix_sync_fingerprints TO anon;
GRANT TRIGGER ON TABLE public.roflix_sync_fingerprints TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_sync_fingerprints TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_sync_fingerprints TO anon;
GRANT TRUNCATE ON TABLE public.roflix_sync_fingerprints TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_sync_fingerprints TO service_role;
GRANT UPDATE ON TABLE public.roflix_sync_fingerprints TO anon;
GRANT UPDATE ON TABLE public.roflix_sync_fingerprints TO authenticated;
GRANT UPDATE ON TABLE public.roflix_sync_fingerprints TO service_role;
GRANT DELETE ON TABLE public.roflix_tv_featured TO anon;
GRANT DELETE ON TABLE public.roflix_tv_featured TO authenticated;
GRANT DELETE ON TABLE public.roflix_tv_featured TO service_role;
GRANT INSERT ON TABLE public.roflix_tv_featured TO anon;
GRANT INSERT ON TABLE public.roflix_tv_featured TO authenticated;
GRANT INSERT ON TABLE public.roflix_tv_featured TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_tv_featured TO anon;
GRANT MAINTAIN ON TABLE public.roflix_tv_featured TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_tv_featured TO service_role;
GRANT REFERENCES ON TABLE public.roflix_tv_featured TO anon;
GRANT REFERENCES ON TABLE public.roflix_tv_featured TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_tv_featured TO service_role;
GRANT SELECT ON TABLE public.roflix_tv_featured TO anon;
GRANT SELECT ON TABLE public.roflix_tv_featured TO authenticated;
GRANT SELECT ON TABLE public.roflix_tv_featured TO service_role;
GRANT TRIGGER ON TABLE public.roflix_tv_featured TO anon;
GRANT TRIGGER ON TABLE public.roflix_tv_featured TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_tv_featured TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_tv_featured TO anon;
GRANT TRUNCATE ON TABLE public.roflix_tv_featured TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_tv_featured TO service_role;
GRANT UPDATE ON TABLE public.roflix_tv_featured TO anon;
GRANT UPDATE ON TABLE public.roflix_tv_featured TO authenticated;
GRANT UPDATE ON TABLE public.roflix_tv_featured TO service_role;
GRANT DELETE ON TABLE public.roflix_tv_settings TO anon;
GRANT DELETE ON TABLE public.roflix_tv_settings TO authenticated;
GRANT DELETE ON TABLE public.roflix_tv_settings TO service_role;
GRANT INSERT ON TABLE public.roflix_tv_settings TO anon;
GRANT INSERT ON TABLE public.roflix_tv_settings TO authenticated;
GRANT INSERT ON TABLE public.roflix_tv_settings TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_tv_settings TO anon;
GRANT MAINTAIN ON TABLE public.roflix_tv_settings TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_tv_settings TO service_role;
GRANT REFERENCES ON TABLE public.roflix_tv_settings TO anon;
GRANT REFERENCES ON TABLE public.roflix_tv_settings TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_tv_settings TO service_role;
GRANT SELECT ON TABLE public.roflix_tv_settings TO anon;
GRANT SELECT ON TABLE public.roflix_tv_settings TO authenticated;
GRANT SELECT ON TABLE public.roflix_tv_settings TO service_role;
GRANT TRIGGER ON TABLE public.roflix_tv_settings TO anon;
GRANT TRIGGER ON TABLE public.roflix_tv_settings TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_tv_settings TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_tv_settings TO anon;
GRANT TRUNCATE ON TABLE public.roflix_tv_settings TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_tv_settings TO service_role;
GRANT UPDATE ON TABLE public.roflix_tv_settings TO anon;
GRANT UPDATE ON TABLE public.roflix_tv_settings TO authenticated;
GRANT UPDATE ON TABLE public.roflix_tv_settings TO service_role;
GRANT DELETE ON TABLE public.roflix_watch_history TO anon;
GRANT DELETE ON TABLE public.roflix_watch_history TO authenticated;
GRANT DELETE ON TABLE public.roflix_watch_history TO service_role;
GRANT INSERT ON TABLE public.roflix_watch_history TO anon;
GRANT INSERT ON TABLE public.roflix_watch_history TO authenticated;
GRANT INSERT ON TABLE public.roflix_watch_history TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_watch_history TO anon;
GRANT MAINTAIN ON TABLE public.roflix_watch_history TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_watch_history TO service_role;
GRANT REFERENCES ON TABLE public.roflix_watch_history TO anon;
GRANT REFERENCES ON TABLE public.roflix_watch_history TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_watch_history TO service_role;
GRANT SELECT ON TABLE public.roflix_watch_history TO anon;
GRANT SELECT ON TABLE public.roflix_watch_history TO authenticated;
GRANT SELECT ON TABLE public.roflix_watch_history TO service_role;
GRANT TRIGGER ON TABLE public.roflix_watch_history TO anon;
GRANT TRIGGER ON TABLE public.roflix_watch_history TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_watch_history TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_watch_history TO anon;
GRANT TRUNCATE ON TABLE public.roflix_watch_history TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_watch_history TO service_role;
GRANT UPDATE ON TABLE public.roflix_watch_history TO anon;
GRANT UPDATE ON TABLE public.roflix_watch_history TO authenticated;
GRANT UPDATE ON TABLE public.roflix_watch_history TO service_role;
GRANT DELETE ON TABLE public.roflix_watch_metrics TO service_role;
GRANT INSERT ON TABLE public.roflix_watch_metrics TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_watch_metrics TO service_role;
GRANT REFERENCES ON TABLE public.roflix_watch_metrics TO service_role;
GRANT SELECT ON TABLE public.roflix_watch_metrics TO service_role;
GRANT TRIGGER ON TABLE public.roflix_watch_metrics TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_watch_metrics TO service_role;
GRANT UPDATE ON TABLE public.roflix_watch_metrics TO service_role;
GRANT DELETE ON TABLE public.roflix_watch_reward_claims TO service_role;
GRANT INSERT ON TABLE public.roflix_watch_reward_claims TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_watch_reward_claims TO service_role;
GRANT REFERENCES ON TABLE public.roflix_watch_reward_claims TO service_role;
GRANT SELECT ON TABLE public.roflix_watch_reward_claims TO service_role;
GRANT TRIGGER ON TABLE public.roflix_watch_reward_claims TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_watch_reward_claims TO service_role;
GRANT UPDATE ON TABLE public.roflix_watch_reward_claims TO service_role;
GRANT SELECT ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.roflix_watch_reward_claims_id_seq TO service_role;
GRANT DELETE ON TABLE public.roflix_watchlist TO anon;
GRANT DELETE ON TABLE public.roflix_watchlist TO authenticated;
GRANT DELETE ON TABLE public.roflix_watchlist TO service_role;
GRANT INSERT ON TABLE public.roflix_watchlist TO anon;
GRANT INSERT ON TABLE public.roflix_watchlist TO authenticated;
GRANT INSERT ON TABLE public.roflix_watchlist TO service_role;
GRANT MAINTAIN ON TABLE public.roflix_watchlist TO anon;
GRANT MAINTAIN ON TABLE public.roflix_watchlist TO authenticated;
GRANT MAINTAIN ON TABLE public.roflix_watchlist TO service_role;
GRANT REFERENCES ON TABLE public.roflix_watchlist TO anon;
GRANT REFERENCES ON TABLE public.roflix_watchlist TO authenticated;
GRANT REFERENCES ON TABLE public.roflix_watchlist TO service_role;
GRANT SELECT ON TABLE public.roflix_watchlist TO anon;
GRANT SELECT ON TABLE public.roflix_watchlist TO authenticated;
GRANT SELECT ON TABLE public.roflix_watchlist TO service_role;
GRANT TRIGGER ON TABLE public.roflix_watchlist TO anon;
GRANT TRIGGER ON TABLE public.roflix_watchlist TO authenticated;
GRANT TRIGGER ON TABLE public.roflix_watchlist TO service_role;
GRANT TRUNCATE ON TABLE public.roflix_watchlist TO anon;
GRANT TRUNCATE ON TABLE public.roflix_watchlist TO authenticated;
GRANT TRUNCATE ON TABLE public.roflix_watchlist TO service_role;
GRANT UPDATE ON TABLE public.roflix_watchlist TO anon;
GRANT UPDATE ON TABLE public.roflix_watchlist TO authenticated;
GRANT UPDATE ON TABLE public.roflix_watchlist TO service_role;
GRANT SELECT ON SEQUENCE public.roflix_watchlist_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.roflix_watchlist_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.roflix_watchlist_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.roflix_watchlist_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.roflix_watchlist_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.roflix_watchlist_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.roflix_watchlist_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.roflix_watchlist_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.roflix_watchlist_id_seq TO service_role;
GRANT DELETE ON TABLE public.rohub_published_themes TO anon;
GRANT DELETE ON TABLE public.rohub_published_themes TO authenticated;
GRANT DELETE ON TABLE public.rohub_published_themes TO service_role;
GRANT INSERT ON TABLE public.rohub_published_themes TO anon;
GRANT INSERT ON TABLE public.rohub_published_themes TO authenticated;
GRANT INSERT ON TABLE public.rohub_published_themes TO service_role;
GRANT MAINTAIN ON TABLE public.rohub_published_themes TO anon;
GRANT MAINTAIN ON TABLE public.rohub_published_themes TO authenticated;
GRANT MAINTAIN ON TABLE public.rohub_published_themes TO service_role;
GRANT REFERENCES ON TABLE public.rohub_published_themes TO anon;
GRANT REFERENCES ON TABLE public.rohub_published_themes TO authenticated;
GRANT REFERENCES ON TABLE public.rohub_published_themes TO service_role;
GRANT SELECT ON TABLE public.rohub_published_themes TO anon;
GRANT SELECT ON TABLE public.rohub_published_themes TO authenticated;
GRANT SELECT ON TABLE public.rohub_published_themes TO service_role;
GRANT TRIGGER ON TABLE public.rohub_published_themes TO anon;
GRANT TRIGGER ON TABLE public.rohub_published_themes TO authenticated;
GRANT TRIGGER ON TABLE public.rohub_published_themes TO service_role;
GRANT TRUNCATE ON TABLE public.rohub_published_themes TO anon;
GRANT TRUNCATE ON TABLE public.rohub_published_themes TO authenticated;
GRANT TRUNCATE ON TABLE public.rohub_published_themes TO service_role;
GRANT UPDATE ON TABLE public.rohub_published_themes TO anon;
GRANT UPDATE ON TABLE public.rohub_published_themes TO authenticated;
GRANT UPDATE ON TABLE public.rohub_published_themes TO service_role;
GRANT DELETE ON TABLE public.rohub_template_revisions TO anon;
GRANT DELETE ON TABLE public.rohub_template_revisions TO authenticated;
GRANT DELETE ON TABLE public.rohub_template_revisions TO service_role;
GRANT INSERT ON TABLE public.rohub_template_revisions TO anon;
GRANT INSERT ON TABLE public.rohub_template_revisions TO authenticated;
GRANT INSERT ON TABLE public.rohub_template_revisions TO service_role;
GRANT MAINTAIN ON TABLE public.rohub_template_revisions TO anon;
GRANT MAINTAIN ON TABLE public.rohub_template_revisions TO authenticated;
GRANT MAINTAIN ON TABLE public.rohub_template_revisions TO service_role;
GRANT REFERENCES ON TABLE public.rohub_template_revisions TO anon;
GRANT REFERENCES ON TABLE public.rohub_template_revisions TO authenticated;
GRANT REFERENCES ON TABLE public.rohub_template_revisions TO service_role;
GRANT SELECT ON TABLE public.rohub_template_revisions TO anon;
GRANT SELECT ON TABLE public.rohub_template_revisions TO authenticated;
GRANT SELECT ON TABLE public.rohub_template_revisions TO service_role;
GRANT TRIGGER ON TABLE public.rohub_template_revisions TO anon;
GRANT TRIGGER ON TABLE public.rohub_template_revisions TO authenticated;
GRANT TRIGGER ON TABLE public.rohub_template_revisions TO service_role;
GRANT TRUNCATE ON TABLE public.rohub_template_revisions TO anon;
GRANT TRUNCATE ON TABLE public.rohub_template_revisions TO authenticated;
GRANT TRUNCATE ON TABLE public.rohub_template_revisions TO service_role;
GRANT UPDATE ON TABLE public.rohub_template_revisions TO anon;
GRANT UPDATE ON TABLE public.rohub_template_revisions TO authenticated;
GRANT UPDATE ON TABLE public.rohub_template_revisions TO service_role;
GRANT DELETE ON TABLE public.rohub_templates TO anon;
GRANT DELETE ON TABLE public.rohub_templates TO authenticated;
GRANT DELETE ON TABLE public.rohub_templates TO service_role;
GRANT INSERT ON TABLE public.rohub_templates TO anon;
GRANT INSERT ON TABLE public.rohub_templates TO authenticated;
GRANT INSERT ON TABLE public.rohub_templates TO service_role;
GRANT MAINTAIN ON TABLE public.rohub_templates TO anon;
GRANT MAINTAIN ON TABLE public.rohub_templates TO authenticated;
GRANT MAINTAIN ON TABLE public.rohub_templates TO service_role;
GRANT REFERENCES ON TABLE public.rohub_templates TO anon;
GRANT REFERENCES ON TABLE public.rohub_templates TO authenticated;
GRANT REFERENCES ON TABLE public.rohub_templates TO service_role;
GRANT SELECT ON TABLE public.rohub_templates TO anon;
GRANT SELECT ON TABLE public.rohub_templates TO authenticated;
GRANT SELECT ON TABLE public.rohub_templates TO service_role;
GRANT TRIGGER ON TABLE public.rohub_templates TO anon;
GRANT TRIGGER ON TABLE public.rohub_templates TO authenticated;
GRANT TRIGGER ON TABLE public.rohub_templates TO service_role;
GRANT TRUNCATE ON TABLE public.rohub_templates TO anon;
GRANT TRUNCATE ON TABLE public.rohub_templates TO authenticated;
GRANT TRUNCATE ON TABLE public.rohub_templates TO service_role;
GRANT UPDATE ON TABLE public.rohub_templates TO anon;
GRANT UPDATE ON TABLE public.rohub_templates TO authenticated;
GRANT UPDATE ON TABLE public.rohub_templates TO service_role;
GRANT DELETE ON TABLE public.rotruyen_audit_logs TO anon;
GRANT DELETE ON TABLE public.rotruyen_audit_logs TO authenticated;
GRANT DELETE ON TABLE public.rotruyen_audit_logs TO service_role;
GRANT INSERT ON TABLE public.rotruyen_audit_logs TO anon;
GRANT INSERT ON TABLE public.rotruyen_audit_logs TO authenticated;
GRANT INSERT ON TABLE public.rotruyen_audit_logs TO service_role;
GRANT MAINTAIN ON TABLE public.rotruyen_audit_logs TO anon;
GRANT MAINTAIN ON TABLE public.rotruyen_audit_logs TO authenticated;
GRANT MAINTAIN ON TABLE public.rotruyen_audit_logs TO service_role;
GRANT REFERENCES ON TABLE public.rotruyen_audit_logs TO anon;
GRANT REFERENCES ON TABLE public.rotruyen_audit_logs TO authenticated;
GRANT REFERENCES ON TABLE public.rotruyen_audit_logs TO service_role;
GRANT SELECT ON TABLE public.rotruyen_audit_logs TO anon;
GRANT SELECT ON TABLE public.rotruyen_audit_logs TO authenticated;
GRANT SELECT ON TABLE public.rotruyen_audit_logs TO service_role;
GRANT TRIGGER ON TABLE public.rotruyen_audit_logs TO anon;
GRANT TRIGGER ON TABLE public.rotruyen_audit_logs TO authenticated;
GRANT TRIGGER ON TABLE public.rotruyen_audit_logs TO service_role;
GRANT TRUNCATE ON TABLE public.rotruyen_audit_logs TO anon;
GRANT TRUNCATE ON TABLE public.rotruyen_audit_logs TO authenticated;
GRANT TRUNCATE ON TABLE public.rotruyen_audit_logs TO service_role;
GRANT UPDATE ON TABLE public.rotruyen_audit_logs TO anon;
GRANT UPDATE ON TABLE public.rotruyen_audit_logs TO authenticated;
GRANT UPDATE ON TABLE public.rotruyen_audit_logs TO service_role;
GRANT SELECT ON SEQUENCE public.rotruyen_audit_logs_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.rotruyen_audit_logs_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.rotruyen_audit_logs_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.rotruyen_audit_logs_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.rotruyen_audit_logs_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.rotruyen_audit_logs_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.rotruyen_audit_logs_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.rotruyen_audit_logs_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.rotruyen_audit_logs_id_seq TO service_role;
GRANT DELETE ON TABLE public.rotruyen_chapters TO anon;
GRANT DELETE ON TABLE public.rotruyen_chapters TO authenticated;
GRANT DELETE ON TABLE public.rotruyen_chapters TO service_role;
GRANT INSERT ON TABLE public.rotruyen_chapters TO anon;
GRANT INSERT ON TABLE public.rotruyen_chapters TO authenticated;
GRANT INSERT ON TABLE public.rotruyen_chapters TO service_role;
GRANT MAINTAIN ON TABLE public.rotruyen_chapters TO anon;
GRANT MAINTAIN ON TABLE public.rotruyen_chapters TO authenticated;
GRANT MAINTAIN ON TABLE public.rotruyen_chapters TO service_role;
GRANT REFERENCES ON TABLE public.rotruyen_chapters TO anon;
GRANT REFERENCES ON TABLE public.rotruyen_chapters TO authenticated;
GRANT REFERENCES ON TABLE public.rotruyen_chapters TO service_role;
GRANT SELECT ON TABLE public.rotruyen_chapters TO anon;
GRANT SELECT ON TABLE public.rotruyen_chapters TO authenticated;
GRANT SELECT ON TABLE public.rotruyen_chapters TO service_role;
GRANT TRIGGER ON TABLE public.rotruyen_chapters TO anon;
GRANT TRIGGER ON TABLE public.rotruyen_chapters TO authenticated;
GRANT TRIGGER ON TABLE public.rotruyen_chapters TO service_role;
GRANT TRUNCATE ON TABLE public.rotruyen_chapters TO anon;
GRANT TRUNCATE ON TABLE public.rotruyen_chapters TO authenticated;
GRANT TRUNCATE ON TABLE public.rotruyen_chapters TO service_role;
GRANT UPDATE ON TABLE public.rotruyen_chapters TO anon;
GRANT UPDATE ON TABLE public.rotruyen_chapters TO authenticated;
GRANT UPDATE ON TABLE public.rotruyen_chapters TO service_role;
GRANT DELETE ON TABLE public.rotruyen_genres TO anon;
GRANT DELETE ON TABLE public.rotruyen_genres TO authenticated;
GRANT DELETE ON TABLE public.rotruyen_genres TO service_role;
GRANT INSERT ON TABLE public.rotruyen_genres TO anon;
GRANT INSERT ON TABLE public.rotruyen_genres TO authenticated;
GRANT INSERT ON TABLE public.rotruyen_genres TO service_role;
GRANT MAINTAIN ON TABLE public.rotruyen_genres TO anon;
GRANT MAINTAIN ON TABLE public.rotruyen_genres TO authenticated;
GRANT MAINTAIN ON TABLE public.rotruyen_genres TO service_role;
GRANT REFERENCES ON TABLE public.rotruyen_genres TO anon;
GRANT REFERENCES ON TABLE public.rotruyen_genres TO authenticated;
GRANT REFERENCES ON TABLE public.rotruyen_genres TO service_role;
GRANT SELECT ON TABLE public.rotruyen_genres TO anon;
GRANT SELECT ON TABLE public.rotruyen_genres TO authenticated;
GRANT SELECT ON TABLE public.rotruyen_genres TO service_role;
GRANT TRIGGER ON TABLE public.rotruyen_genres TO anon;
GRANT TRIGGER ON TABLE public.rotruyen_genres TO authenticated;
GRANT TRIGGER ON TABLE public.rotruyen_genres TO service_role;
GRANT TRUNCATE ON TABLE public.rotruyen_genres TO anon;
GRANT TRUNCATE ON TABLE public.rotruyen_genres TO authenticated;
GRANT TRUNCATE ON TABLE public.rotruyen_genres TO service_role;
GRANT UPDATE ON TABLE public.rotruyen_genres TO anon;
GRANT UPDATE ON TABLE public.rotruyen_genres TO authenticated;
GRANT UPDATE ON TABLE public.rotruyen_genres TO service_role;
GRANT DELETE ON TABLE public.rotruyen_series TO anon;
GRANT DELETE ON TABLE public.rotruyen_series TO authenticated;
GRANT DELETE ON TABLE public.rotruyen_series TO service_role;
GRANT INSERT ON TABLE public.rotruyen_series TO anon;
GRANT INSERT ON TABLE public.rotruyen_series TO authenticated;
GRANT INSERT ON TABLE public.rotruyen_series TO service_role;
GRANT MAINTAIN ON TABLE public.rotruyen_series TO anon;
GRANT MAINTAIN ON TABLE public.rotruyen_series TO authenticated;
GRANT MAINTAIN ON TABLE public.rotruyen_series TO service_role;
GRANT REFERENCES ON TABLE public.rotruyen_series TO anon;
GRANT REFERENCES ON TABLE public.rotruyen_series TO authenticated;
GRANT REFERENCES ON TABLE public.rotruyen_series TO service_role;
GRANT SELECT ON TABLE public.rotruyen_series TO anon;
GRANT SELECT ON TABLE public.rotruyen_series TO authenticated;
GRANT SELECT ON TABLE public.rotruyen_series TO service_role;
GRANT TRIGGER ON TABLE public.rotruyen_series TO anon;
GRANT TRIGGER ON TABLE public.rotruyen_series TO authenticated;
GRANT TRIGGER ON TABLE public.rotruyen_series TO service_role;
GRANT TRUNCATE ON TABLE public.rotruyen_series TO anon;
GRANT TRUNCATE ON TABLE public.rotruyen_series TO authenticated;
GRANT TRUNCATE ON TABLE public.rotruyen_series TO service_role;
GRANT UPDATE ON TABLE public.rotruyen_series TO anon;
GRANT UPDATE ON TABLE public.rotruyen_series TO authenticated;
GRANT UPDATE ON TABLE public.rotruyen_series TO service_role;
GRANT DELETE ON TABLE public.rotruyen_settings TO anon;
GRANT DELETE ON TABLE public.rotruyen_settings TO authenticated;
GRANT DELETE ON TABLE public.rotruyen_settings TO service_role;
GRANT INSERT ON TABLE public.rotruyen_settings TO anon;
GRANT INSERT ON TABLE public.rotruyen_settings TO authenticated;
GRANT INSERT ON TABLE public.rotruyen_settings TO service_role;
GRANT MAINTAIN ON TABLE public.rotruyen_settings TO anon;
GRANT MAINTAIN ON TABLE public.rotruyen_settings TO authenticated;
GRANT MAINTAIN ON TABLE public.rotruyen_settings TO service_role;
GRANT REFERENCES ON TABLE public.rotruyen_settings TO anon;
GRANT REFERENCES ON TABLE public.rotruyen_settings TO authenticated;
GRANT REFERENCES ON TABLE public.rotruyen_settings TO service_role;
GRANT SELECT ON TABLE public.rotruyen_settings TO anon;
GRANT SELECT ON TABLE public.rotruyen_settings TO authenticated;
GRANT SELECT ON TABLE public.rotruyen_settings TO service_role;
GRANT TRIGGER ON TABLE public.rotruyen_settings TO anon;
GRANT TRIGGER ON TABLE public.rotruyen_settings TO authenticated;
GRANT TRIGGER ON TABLE public.rotruyen_settings TO service_role;
GRANT TRUNCATE ON TABLE public.rotruyen_settings TO anon;
GRANT TRUNCATE ON TABLE public.rotruyen_settings TO authenticated;
GRANT TRUNCATE ON TABLE public.rotruyen_settings TO service_role;
GRANT UPDATE ON TABLE public.rotruyen_settings TO anon;
GRANT UPDATE ON TABLE public.rotruyen_settings TO authenticated;
GRANT UPDATE ON TABLE public.rotruyen_settings TO service_role;
GRANT DELETE ON TABLE public.rotruyen_user_library TO anon;
GRANT DELETE ON TABLE public.rotruyen_user_library TO authenticated;
GRANT DELETE ON TABLE public.rotruyen_user_library TO service_role;
GRANT INSERT ON TABLE public.rotruyen_user_library TO anon;
GRANT INSERT ON TABLE public.rotruyen_user_library TO authenticated;
GRANT INSERT ON TABLE public.rotruyen_user_library TO service_role;
GRANT MAINTAIN ON TABLE public.rotruyen_user_library TO anon;
GRANT MAINTAIN ON TABLE public.rotruyen_user_library TO authenticated;
GRANT MAINTAIN ON TABLE public.rotruyen_user_library TO service_role;
GRANT REFERENCES ON TABLE public.rotruyen_user_library TO anon;
GRANT REFERENCES ON TABLE public.rotruyen_user_library TO authenticated;
GRANT REFERENCES ON TABLE public.rotruyen_user_library TO service_role;
GRANT SELECT ON TABLE public.rotruyen_user_library TO anon;
GRANT SELECT ON TABLE public.rotruyen_user_library TO authenticated;
GRANT SELECT ON TABLE public.rotruyen_user_library TO service_role;
GRANT TRIGGER ON TABLE public.rotruyen_user_library TO anon;
GRANT TRIGGER ON TABLE public.rotruyen_user_library TO authenticated;
GRANT TRIGGER ON TABLE public.rotruyen_user_library TO service_role;
GRANT TRUNCATE ON TABLE public.rotruyen_user_library TO anon;
GRANT TRUNCATE ON TABLE public.rotruyen_user_library TO authenticated;
GRANT TRUNCATE ON TABLE public.rotruyen_user_library TO service_role;
GRANT UPDATE ON TABLE public.rotruyen_user_library TO anon;
GRANT UPDATE ON TABLE public.rotruyen_user_library TO authenticated;
GRANT UPDATE ON TABLE public.rotruyen_user_library TO service_role;
GRANT DELETE ON TABLE public.watch_room_events TO anon;
GRANT DELETE ON TABLE public.watch_room_events TO authenticated;
GRANT DELETE ON TABLE public.watch_room_events TO service_role;
GRANT INSERT ON TABLE public.watch_room_events TO anon;
GRANT INSERT ON TABLE public.watch_room_events TO authenticated;
GRANT INSERT ON TABLE public.watch_room_events TO service_role;
GRANT MAINTAIN ON TABLE public.watch_room_events TO anon;
GRANT MAINTAIN ON TABLE public.watch_room_events TO authenticated;
GRANT MAINTAIN ON TABLE public.watch_room_events TO service_role;
GRANT REFERENCES ON TABLE public.watch_room_events TO anon;
GRANT REFERENCES ON TABLE public.watch_room_events TO authenticated;
GRANT REFERENCES ON TABLE public.watch_room_events TO service_role;
GRANT SELECT ON TABLE public.watch_room_events TO anon;
GRANT SELECT ON TABLE public.watch_room_events TO authenticated;
GRANT SELECT ON TABLE public.watch_room_events TO service_role;
GRANT TRIGGER ON TABLE public.watch_room_events TO anon;
GRANT TRIGGER ON TABLE public.watch_room_events TO authenticated;
GRANT TRIGGER ON TABLE public.watch_room_events TO service_role;
GRANT TRUNCATE ON TABLE public.watch_room_events TO anon;
GRANT TRUNCATE ON TABLE public.watch_room_events TO authenticated;
GRANT TRUNCATE ON TABLE public.watch_room_events TO service_role;
GRANT UPDATE ON TABLE public.watch_room_events TO anon;
GRANT UPDATE ON TABLE public.watch_room_events TO authenticated;
GRANT UPDATE ON TABLE public.watch_room_events TO service_role;
GRANT SELECT ON SEQUENCE public.watch_room_events_id_seq TO anon;
GRANT SELECT ON SEQUENCE public.watch_room_events_id_seq TO authenticated;
GRANT SELECT ON SEQUENCE public.watch_room_events_id_seq TO service_role;
GRANT UPDATE ON SEQUENCE public.watch_room_events_id_seq TO anon;
GRANT UPDATE ON SEQUENCE public.watch_room_events_id_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.watch_room_events_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.watch_room_events_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.watch_room_events_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.watch_room_events_id_seq TO service_role;
GRANT DELETE ON TABLE public.watch_room_members TO anon;
GRANT DELETE ON TABLE public.watch_room_members TO authenticated;
GRANT DELETE ON TABLE public.watch_room_members TO service_role;
GRANT INSERT ON TABLE public.watch_room_members TO anon;
GRANT INSERT ON TABLE public.watch_room_members TO authenticated;
GRANT INSERT ON TABLE public.watch_room_members TO service_role;
GRANT MAINTAIN ON TABLE public.watch_room_members TO anon;
GRANT MAINTAIN ON TABLE public.watch_room_members TO authenticated;
GRANT MAINTAIN ON TABLE public.watch_room_members TO service_role;
GRANT REFERENCES ON TABLE public.watch_room_members TO anon;
GRANT REFERENCES ON TABLE public.watch_room_members TO authenticated;
GRANT REFERENCES ON TABLE public.watch_room_members TO service_role;
GRANT SELECT ON TABLE public.watch_room_members TO anon;
GRANT SELECT ON TABLE public.watch_room_members TO authenticated;
GRANT SELECT ON TABLE public.watch_room_members TO service_role;
GRANT TRIGGER ON TABLE public.watch_room_members TO anon;
GRANT TRIGGER ON TABLE public.watch_room_members TO authenticated;
GRANT TRIGGER ON TABLE public.watch_room_members TO service_role;
GRANT TRUNCATE ON TABLE public.watch_room_members TO anon;
GRANT TRUNCATE ON TABLE public.watch_room_members TO authenticated;
GRANT TRUNCATE ON TABLE public.watch_room_members TO service_role;
GRANT UPDATE ON TABLE public.watch_room_members TO anon;
GRANT UPDATE ON TABLE public.watch_room_members TO authenticated;
GRANT UPDATE ON TABLE public.watch_room_members TO service_role;
GRANT DELETE ON TABLE public.watch_rooms TO anon;
GRANT DELETE ON TABLE public.watch_rooms TO authenticated;
GRANT DELETE ON TABLE public.watch_rooms TO service_role;
GRANT INSERT ON TABLE public.watch_rooms TO anon;
GRANT INSERT ON TABLE public.watch_rooms TO authenticated;
GRANT INSERT ON TABLE public.watch_rooms TO service_role;
GRANT MAINTAIN ON TABLE public.watch_rooms TO anon;
GRANT MAINTAIN ON TABLE public.watch_rooms TO authenticated;
GRANT MAINTAIN ON TABLE public.watch_rooms TO service_role;
GRANT REFERENCES ON TABLE public.watch_rooms TO anon;
GRANT REFERENCES ON TABLE public.watch_rooms TO authenticated;
GRANT REFERENCES ON TABLE public.watch_rooms TO service_role;
GRANT SELECT ON TABLE public.watch_rooms TO anon;
GRANT SELECT ON TABLE public.watch_rooms TO authenticated;
GRANT SELECT ON TABLE public.watch_rooms TO service_role;
GRANT TRIGGER ON TABLE public.watch_rooms TO anon;
GRANT TRIGGER ON TABLE public.watch_rooms TO authenticated;
GRANT TRIGGER ON TABLE public.watch_rooms TO service_role;
GRANT TRUNCATE ON TABLE public.watch_rooms TO anon;
GRANT TRUNCATE ON TABLE public.watch_rooms TO authenticated;
GRANT TRUNCATE ON TABLE public.watch_rooms TO service_role;
GRANT UPDATE ON TABLE public.watch_rooms TO anon;
GRANT UPDATE ON TABLE public.watch_rooms TO authenticated;
GRANT UPDATE ON TABLE public.watch_rooms TO service_role;

-- 10. Function execute grants
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_adjust_gem(p_user_id uuid, p_delta bigint, p_reason text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_analytics(p_days integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_cleanup_sessions() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_custom_movie_delete(p_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_custom_movie_upsert(p_id uuid, p_slug text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_actors jsonb, p_directors jsonb, p_categories jsonb, p_year integer, p_quality text, p_lang text, p_trailer_url text, p_video_path text, p_video_mime text, p_locked boolean, p_lock_reason text, p_published boolean, p_admin_note text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_drive_movie_upsert(p_id uuid, p_slug text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_year integer, p_quality text, p_lang text, p_categories text, p_drive_file_id text, p_drive_share_url text, p_locked boolean, p_lock_reason text, p_published boolean, p_admin_note text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_find_game_users(p_query text, p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_live_ops() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_live_viewers() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_comment_delete(p_id text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_comment_delete(p_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_comment_status(p_id text, p_status text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_comment_status(p_id uuid, p_status text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_curation_delete(p_source_id text, p_movie_slug text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_curation_upsert(p_source_id text, p_movie_slug text, p_movie_title text, p_origin_name text, p_poster_url text, p_year integer, p_type_key text, p_list_keys text[], p_genre_keys text[], p_source_genres text[], p_quality text, p_lang text, p_status text, p_auto_suggested boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_override_delete(p_source_id text, p_movie_slug text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_override_upsert(p_source_id text, p_movie_slug text, p_hidden boolean, p_locked boolean, p_lock_reason text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_actors jsonb, p_directors jsonb, p_categories jsonb, p_year integer, p_quality text, p_lang text, p_trailer_url text, p_preferred_source_id text, p_episodes jsonb, p_admin_note text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_movie_settings_update(p_lock_18_plus boolean, p_force_login boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_platform_metrics() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_release_schedule_delete(p_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_release_schedule_save(p_id uuid, p_movie_slug text, p_title text, p_origin_name text, p_source_id text, p_poster_url text, p_release_at timestamp with time zone, p_summary text, p_note text, p_featured boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_reports() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_revoke_sessions(p_user_id uuid, p_session_id text, p_reason text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_schedule_stats() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_security_feed(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_set_account_control(p_user_id uuid, p_status text, p_suspend_minutes integer, p_reason text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_set_feature_flag(p_key text, p_enabled boolean, p_config jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_set_gem(p_user_id uuid, p_balance bigint, p_reason text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_set_role(p_user_id uuid, p_role text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_set_status(p_user_id uuid, p_status text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_stats() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_tv_featured_delete(p_source_id text, p_movie_slug text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_tv_featured_upsert(p_source_id text, p_movie_slug text, p_title text, p_poster_url text, p_backdrop_url text, p_rank integer, p_enabled boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_tv_settings_update(p_enabled boolean, p_default_source text, p_refresh_minutes integer, p_max_items integer, p_autoplay boolean, p_quality_mode text, p_show_hero boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_user_sessions(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_users() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_watch_history(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_admin_watch_metrics() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_award_watch(p_movie_slug text, p_minutes integer, p_episode boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_cloud_snapshot() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_create_profile() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_create_watch_room(p_name text, p_movie_slug text, p_movie_title text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_create_watch_room_v2(p_name text, p_movie_slug text, p_movie_title text, p_visibility text, p_chat_enabled boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_delete_watch_history(p_slug text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_favorites_get() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_favorites_replace(p_slugs jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_heartbeat(p_session_id text, p_page text, p_movie_slug text, p_movie_title text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_is_admin() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_join_watch_room(p_code text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_join_watch_room_v2(p_code text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_leaderboard(p_limit integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_leaderboard(p_metric text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_leave_watch_room_v2(p_room_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_list_public_watch_rooms_v2() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_movie_comment_audit() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_movie_comment_create(p_movie_slug text, p_movie_title text, p_body text, p_parent_id text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_movie_comment_like(p_id text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_movie_comment_like(p_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_movie_comment_set_status(p_id uuid, p_status text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_notify_comment() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_notify_like() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_profile_get() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_profile_sync(p_profile jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_protect_profile_role() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_public_profile(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_record_watch_progress(p_session_id text, p_movie_slug text, p_movie_title text, p_seconds integer, p_duration_seconds integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_release_schedule_audit() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_release_schedule_touch() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_submit_report(p_target_type text, p_target_id text, p_reason text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_sync_game_state(p_level integer, p_exp bigint, p_gems bigint, p_gems_earned bigint, p_movies_watched bigint, p_episodes_watched bigint, p_comments_count bigint, p_favorites_count bigint, p_watch_minutes bigint, p_gacha_pulls bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_sync_release_schedule() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_sync_watch_history(p_slug text, p_title text, p_poster text, p_episode integer, p_episode_name text, p_progress numeric, p_source_id text, p_genres jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_touch_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_track_event(p_event_type text, p_session_id text, p_page text, p_movie_slug text, p_movie_title text, p_metadata jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_update_profile(p_display_name text, p_bio text, p_avatar_url text, p_banner_url text, p_country text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_user_adjust_gem(p_delta bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_user_get_gem() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_watch_history_get() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_watch_history_sync(p_items jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_watch_room_event(p_room_id uuid, p_event_type text, p_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_watch_room_heartbeat_v2(p_room_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_watch_room_snapshot(p_code text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_watch_room_update_state(p_room_id uuid, p_state jsonb, p_movie_slug text, p_movie_title text, p_episode_index integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_watchlist_get() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roflix_watchlist_replace(p_items jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rohub_storage_cleanup_scan(p_limit integer, p_offset integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rohub_templates_touch_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rotruyen_library_touch_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rotruyen_touch_updated_at() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_adjust_gem(p_user_id uuid, p_delta bigint, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_adjust_gem(p_user_id uuid, p_delta bigint, p_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_analytics(p_days integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_analytics(p_days integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_cleanup_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_cleanup_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_custom_movie_delete(p_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_custom_movie_delete(p_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_custom_movie_upsert(p_id uuid, p_slug text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_actors jsonb, p_directors jsonb, p_categories jsonb, p_year integer, p_quality text, p_lang text, p_trailer_url text, p_video_path text, p_video_mime text, p_locked boolean, p_lock_reason text, p_published boolean, p_admin_note text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_custom_movie_upsert(p_id uuid, p_slug text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_actors jsonb, p_directors jsonb, p_categories jsonb, p_year integer, p_quality text, p_lang text, p_trailer_url text, p_video_path text, p_video_mime text, p_locked boolean, p_lock_reason text, p_published boolean, p_admin_note text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_drive_movie_upsert(p_id uuid, p_slug text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_year integer, p_quality text, p_lang text, p_categories text, p_drive_file_id text, p_drive_share_url text, p_locked boolean, p_lock_reason text, p_published boolean, p_admin_note text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_drive_movie_upsert(p_id uuid, p_slug text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_year integer, p_quality text, p_lang text, p_categories text, p_drive_file_id text, p_drive_share_url text, p_locked boolean, p_lock_reason text, p_published boolean, p_admin_note text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_find_game_users(p_query text, p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_find_game_users(p_query text, p_limit integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_live_ops() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_live_ops() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_live_viewers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_live_viewers() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_comment_delete(p_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_comment_delete(p_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_comment_delete(p_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_comment_delete(p_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_comment_status(p_id text, p_status text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_comment_status(p_id text, p_status text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_comment_status(p_id uuid, p_status text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_comment_status(p_id uuid, p_status text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_curation_delete(p_source_id text, p_movie_slug text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_curation_delete(p_source_id text, p_movie_slug text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_curation_upsert(p_source_id text, p_movie_slug text, p_movie_title text, p_origin_name text, p_poster_url text, p_year integer, p_type_key text, p_list_keys text[], p_genre_keys text[], p_source_genres text[], p_quality text, p_lang text, p_status text, p_auto_suggested boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_curation_upsert(p_source_id text, p_movie_slug text, p_movie_title text, p_origin_name text, p_poster_url text, p_year integer, p_type_key text, p_list_keys text[], p_genre_keys text[], p_source_genres text[], p_quality text, p_lang text, p_status text, p_auto_suggested boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_override_delete(p_source_id text, p_movie_slug text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_override_delete(p_source_id text, p_movie_slug text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_override_upsert(p_source_id text, p_movie_slug text, p_hidden boolean, p_locked boolean, p_lock_reason text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_actors jsonb, p_directors jsonb, p_categories jsonb, p_year integer, p_quality text, p_lang text, p_trailer_url text, p_preferred_source_id text, p_episodes jsonb, p_admin_note text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_override_upsert(p_source_id text, p_movie_slug text, p_hidden boolean, p_locked boolean, p_lock_reason text, p_title text, p_origin_name text, p_summary text, p_poster_url text, p_backdrop_url text, p_actors jsonb, p_directors jsonb, p_categories jsonb, p_year integer, p_quality text, p_lang text, p_trailer_url text, p_preferred_source_id text, p_episodes jsonb, p_admin_note text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_settings_update(p_lock_18_plus boolean, p_force_login boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_movie_settings_update(p_lock_18_plus boolean, p_force_login boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_platform_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_platform_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_release_schedule_delete(p_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_release_schedule_delete(p_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_release_schedule_save(p_id uuid, p_movie_slug text, p_title text, p_origin_name text, p_source_id text, p_poster_url text, p_release_at timestamp with time zone, p_summary text, p_note text, p_featured boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_release_schedule_save(p_id uuid, p_movie_slug text, p_title text, p_origin_name text, p_source_id text, p_poster_url text, p_release_at timestamp with time zone, p_summary text, p_note text, p_featured boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_reports() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_revoke_sessions(p_user_id uuid, p_session_id text, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_revoke_sessions(p_user_id uuid, p_session_id text, p_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_schedule_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_schedule_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_security_feed(p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_security_feed(p_limit integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_account_control(p_user_id uuid, p_status text, p_suspend_minutes integer, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_account_control(p_user_id uuid, p_status text, p_suspend_minutes integer, p_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_feature_flag(p_key text, p_enabled boolean, p_config jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_feature_flag(p_key text, p_enabled boolean, p_config jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_gem(p_user_id uuid, p_balance bigint, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_gem(p_user_id uuid, p_balance bigint, p_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_role(p_user_id uuid, p_role text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_role(p_user_id uuid, p_role text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_status(p_user_id uuid, p_status text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_set_status(p_user_id uuid, p_status text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_tv_featured_delete(p_source_id text, p_movie_slug text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_tv_featured_delete(p_source_id text, p_movie_slug text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_tv_featured_upsert(p_source_id text, p_movie_slug text, p_title text, p_poster_url text, p_backdrop_url text, p_rank integer, p_enabled boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_tv_featured_upsert(p_source_id text, p_movie_slug text, p_title text, p_poster_url text, p_backdrop_url text, p_rank integer, p_enabled boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_tv_settings_update(p_enabled boolean, p_default_source text, p_refresh_minutes integer, p_max_items integer, p_autoplay boolean, p_quality_mode text, p_show_hero boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_tv_settings_update(p_enabled boolean, p_default_source text, p_refresh_minutes integer, p_max_items integer, p_autoplay boolean, p_quality_mode text, p_show_hero boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_user_sessions(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_user_sessions(p_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_watch_history(p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_watch_history(p_limit integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_admin_watch_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_admin_watch_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_award_watch(p_movie_slug text, p_minutes integer, p_episode boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_award_watch(p_movie_slug text, p_minutes integer, p_episode boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_cloud_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_cloud_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_create_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_create_watch_room(p_name text, p_movie_slug text, p_movie_title text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_create_watch_room(p_name text, p_movie_slug text, p_movie_title text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_create_watch_room_v2(p_name text, p_movie_slug text, p_movie_title text, p_visibility text, p_chat_enabled boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_create_watch_room_v2(p_name text, p_movie_slug text, p_movie_title text, p_visibility text, p_chat_enabled boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_delete_watch_history(p_slug text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_delete_watch_history(p_slug text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_favorites_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_favorites_get() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_favorites_replace(p_slugs jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_favorites_replace(p_slugs jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_heartbeat(p_session_id text, p_page text, p_movie_slug text, p_movie_title text) TO anon;
GRANT EXECUTE ON FUNCTION public.roflix_heartbeat(p_session_id text, p_page text, p_movie_slug text, p_movie_title text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_heartbeat(p_session_id text, p_page text, p_movie_slug text, p_movie_title text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_join_watch_room(p_code text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_join_watch_room(p_code text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_join_watch_room_v2(p_code text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_join_watch_room_v2(p_code text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_leaderboard(p_limit integer) TO anon;
GRANT EXECUTE ON FUNCTION public.roflix_leaderboard(p_limit integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_leaderboard(p_limit integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_leaderboard(p_metric text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_leaderboard(p_metric text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_leave_watch_room_v2(p_room_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_leave_watch_room_v2(p_room_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_list_public_watch_rooms_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_list_public_watch_rooms_v2() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_audit() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_create(p_movie_slug text, p_movie_title text, p_body text, p_parent_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_create(p_movie_slug text, p_movie_title text, p_body text, p_parent_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_like(p_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_like(p_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_like(p_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_like(p_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_set_status(p_id uuid, p_status text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_movie_comment_set_status(p_id uuid, p_status text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_notify_comment() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_notify_like() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_profile_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_profile_get() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_profile_sync(p_profile jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_profile_sync(p_profile jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_protect_profile_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_public_profile(p_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.roflix_public_profile(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_public_profile(p_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_record_watch_progress(p_session_id text, p_movie_slug text, p_movie_title text, p_seconds integer, p_duration_seconds integer) TO anon;
GRANT EXECUTE ON FUNCTION public.roflix_record_watch_progress(p_session_id text, p_movie_slug text, p_movie_title text, p_seconds integer, p_duration_seconds integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_record_watch_progress(p_session_id text, p_movie_slug text, p_movie_title text, p_seconds integer, p_duration_seconds integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_release_schedule_audit() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_release_schedule_touch() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.roflix_release_schedule_touch() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_release_schedule_touch() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_submit_report(p_target_type text, p_target_id text, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_submit_report(p_target_type text, p_target_id text, p_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_sync_game_state(p_level integer, p_exp bigint, p_gems bigint, p_gems_earned bigint, p_movies_watched bigint, p_episodes_watched bigint, p_comments_count bigint, p_favorites_count bigint, p_watch_minutes bigint, p_gacha_pulls bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_sync_game_state(p_level integer, p_exp bigint, p_gems bigint, p_gems_earned bigint, p_movies_watched bigint, p_episodes_watched bigint, p_comments_count bigint, p_favorites_count bigint, p_watch_minutes bigint, p_gacha_pulls bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_sync_release_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_sync_release_schedule() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_sync_watch_history(p_slug text, p_title text, p_poster text, p_episode integer, p_episode_name text, p_progress numeric, p_source_id text, p_genres jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_sync_watch_history(p_slug text, p_title text, p_poster text, p_episode integer, p_episode_name text, p_progress numeric, p_source_id text, p_genres jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_touch_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.roflix_touch_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_touch_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_track_event(p_event_type text, p_session_id text, p_page text, p_movie_slug text, p_movie_title text, p_metadata jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.roflix_track_event(p_event_type text, p_session_id text, p_page text, p_movie_slug text, p_movie_title text, p_metadata jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_track_event(p_event_type text, p_session_id text, p_page text, p_movie_slug text, p_movie_title text, p_metadata jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_update_profile(p_display_name text, p_bio text, p_avatar_url text, p_banner_url text, p_country text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_update_profile(p_display_name text, p_bio text, p_avatar_url text, p_banner_url text, p_country text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_user_adjust_gem(p_delta bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_user_adjust_gem(p_delta bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_user_get_gem() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_user_get_gem() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_watch_history_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_watch_history_get() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_watch_history_sync(p_items jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_watch_history_sync(p_items jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_watch_room_event(p_room_id uuid, p_event_type text, p_payload jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_watch_room_event(p_room_id uuid, p_event_type text, p_payload jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_watch_room_heartbeat_v2(p_room_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_watch_room_heartbeat_v2(p_room_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_watch_room_snapshot(p_code text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_watch_room_snapshot(p_code text) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_watch_room_update_state(p_room_id uuid, p_state jsonb, p_movie_slug text, p_movie_title text, p_episode_index integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_watch_room_update_state(p_room_id uuid, p_state jsonb, p_movie_slug text, p_movie_title text, p_episode_index integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_watchlist_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_watchlist_get() TO service_role;
GRANT EXECUTE ON FUNCTION public.roflix_watchlist_replace(p_items jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roflix_watchlist_replace(p_items jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.rohub_storage_cleanup_scan(p_limit integer, p_offset integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rohub_storage_cleanup_scan(p_limit integer, p_offset integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.rohub_templates_touch_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.rohub_templates_touch_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.rohub_templates_touch_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rohub_templates_touch_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.rotruyen_library_touch_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotruyen_library_touch_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.rotruyen_library_touch_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotruyen_library_touch_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.rotruyen_touch_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotruyen_touch_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.rotruyen_touch_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotruyen_touch_updated_at() TO service_role;

commit;
