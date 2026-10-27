# Central Supervisor — RaportFinansowy24

## What this first version does

The existing Fly.io Shorts Generator now exposes a protected, read-only supervisor endpoint:

- `GET /api/supervisor/status`
- Uses the app's existing API session / machine-token authentication.
- Checks the public RaportFinansowy24 website (override with `RAPORTFINANSOWY24_URL`).
- Summarizes retained render jobs (active/completed/failed).
- Reports whether essential server secrets are configured, without returning secret values.
- Reports Telegram approval, Supabase history and Postiz readiness.
- Returns a prioritized `nextActions` list for an operator.

The endpoint does not publish posts, change settings, restart services, or mutate jobs. Postiz auto-publishing stays opt-in and is not enabled by this change.

## Deployment

Merge this pull request into `main`, then let the existing Fly.io deployment pipeline deploy the same app `tworca-shortsow-na-podstawie-newsa-z-bankiepll`. Do not create a second Fly app for this supervisor.

The endpoint is protected by the existing `/api` authentication middleware. Call it with the same valid app session or `Authorization: Bearer <BANKIER_SHORTS_API_TOKEN>` used by existing machine clients. Do not place the token in a browser bundle or share it in chat.

## What is not included yet

This is a useful first supervisory layer, not a fully autonomous AI operator. It provides a live diagnostic snapshot and recommended actions; it does not yet poll on a schedule, send alerts, modify the RaportFinansowy24 site, or run deployments automatically. Those actions require a separate scheduler/alert channel and explicit permissions.
