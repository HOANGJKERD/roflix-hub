# RoFlix Admin 6.1

## What changed

- Realtime feature gates are enforced in the public shell.
- `maintenance_mode` displays a realtime maintenance gate.
- `playback_enabled` pauses HTML5 video and blocks playback attempts client-side.
- Gacha, Cloud Sync, Watch Party, comments and registration controls are hidden when their flags are OFF.
- Admin 6.1 adds a Movie Operations panel with live source health for KKPhim/VSMOV, latency, HTTP status, active viewers and recent errors.

## Security boundary

These browser gates are not authorization. Sensitive mutations remain protected by Supabase RPC/RLS/admin checks. The feature flags are intended to be a fast operational control plane, not a replacement for server-side access control.

## Realtime flow

`roflix_admin_feature_flags` -> Supabase Realtime -> `roflix-feature-gates.js` -> UI/playback enforcement.

The existing three public shortcuts remain unchanged: Bộ sưu tập, Đồng bộ thiết bị, Quản trị.

## Known limitation

The playback gate directly controls HTML5 media. Third-party iframe/player implementations can require their own integration hook because browser code cannot reliably control a cross-origin iframe's internal player API.
