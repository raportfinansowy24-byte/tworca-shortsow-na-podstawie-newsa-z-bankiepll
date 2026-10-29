# Supabase telemetry and learning loop

Pipeline v2 now records its creative decisions and later performance data in Supabase. The purpose is not to claim that the renderer can infer virality by itself; the system records the signals needed to improve the next hook and storyboard after platform analytics are imported.

Apply the migration `supabase/migrations/20261029230000_finance_pipeline_telemetry.sql` after the existing short-history migrations. The server uses the same `SUPABASE_URL` and secret/service-role `SUPABASE_KEY` configuration as the existing job history store.

Each finance run is stored in `short_pipeline_runs`. The row contains the article, plan, hook, facts, Quality Gate metrics, selected variant and lifecycle status. Detailed decisions are appended to `short_pipeline_events`, including hook generation, hook selection, Quality Gate results, scene motion presets, sound effects, successful renders and failures.

Platform analytics can be imported through the authenticated endpoint:

```http
POST /api/pipeline/retention
Content-Type: application/json
Authorization: Bearer <app-session-token>
```

Example payload:

```json
{
  "runId": "fsp_abc123",
  "jobId": "job_autopilot_...",
  "platform": "youtube-shorts",
  "externalVideoId": "abc123",
  "hookText": "Rynek bije rekordy, ale Cyfrowy Polsat traci 17,67%.",
  "niche": "Giełda GPW & Spółki",
  "views": 12000,
  "averageWatchSeconds": 14.2,
  "averageCompletionRate": 0.61,
  "retention1s": 0.92,
  "retention3s": 0.81,
  "retention50Percent": 0.70,
  "retention100Percent": 0.61,
  "likes": 640,
  "comments": 31,
  "shares": 94,
  "saves": 120,
  "capturedAt": "2026-10-30T12:00:00Z"
}
```

Historical aggregates are available through `GET /api/pipeline/learning-signals?niche=Giełda%20GPW%20%26%20Spółki`. The view ranks hook texts by average completion rate and exposes sample size, average watch time and average shares. The next creative planning step can use these signals as a baseline for hook candidates and A/B selection; no signal is treated as reliable until it has enough samples for the project’s chosen threshold.

If Supabase is unavailable, rendering continues and telemetry is best-effort only. The renderer never silently downgrades ElevenLabs or media quality because telemetry is unavailable.
