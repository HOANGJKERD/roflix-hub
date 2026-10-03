# RoFlix Full Split Architecture

## Runtime order
1. Tailwind CDN + Tailwind config
2. CSS modules
3. Supabase CDN
4. `js/config/*`
5. `js/core/supabase.js`
6. `js/core/boot.js`
7. `js/app/00-api-config.js` then numbered app sections in order
8. `js/security/devtools-guard.js`
9. `js/features/roflix-tools.js`
10. `js/integrations/supabase-cloud.js`

## Authentication
The main login/register flow uses Supabase Auth. Credentials are not stored in localStorage.
`public.profiles` should be populated by the database trigger after `auth.users` insertion.

## Local storage
Local storage remains for client-side UX/game state such as watch history, favorites, profile presentation, ratings, gems, achievements, and preferences. It is not the source of truth for authentication.

## Cloud data
Community/Admin features use Supabase. RLS and database triggers are defined in `supabase/setup.sql` and the optional realtime upgrade migration.
