# Strict media policy

Auto-Pilot render jobs set `allowLocalFallback: false`. If a scene URL is invalid, returns a non-success HTTP status, times out, or fails during download, the job ends with an error beginning with `Brak dopasowanego klipu wideo`. No synthetic grid background is generated and no final MP4 is marked as completed.

The `downloadFile` helper still accepts an explicit `allowLocalFallback: true` for legacy/manual flows that intentionally want a local placeholder. Auto-Pilot never enables that flag.

The negative integration check submits an unavailable scene URL and verifies that the endpoint returns an error instead of creating a video.
