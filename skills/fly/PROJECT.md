# Fly.io operations — RaportFinansowy24 Shorts Creator

This is the repository-specific overlay for the vendored official Fly.io skill. Read this file together with [SKILL.md](SKILL.md) before operating the production app.

## Target

- Repository: `raportfinansowy24-byte/tworca-shortsow-na-podstawie-newsa-z-bankiepll`
- Fly app: `tworca-shortsow-na-podstawie-newsa-z-bankiepll`
- Primary region: `fra` (Frankfurt)
- Configuration: `fly.toml`
- Public health endpoint: `https://tworca-shortsow-na-podstawie-newsa-z-bankiepll.fly.dev/api/health`
- Internal HTTP port: `8080`
- Persistent volume: `shorts_data`, mounted at `/app/exports`, configured initial size `10gb`
- Machine profile in `fly.toml`: `shared-cpu-8x`. Do not infer actual RAM from the profile name; read platform state.

Always pass the exact app explicitly: `-a tworca-shortsow-na-podstawie-newsa-z-bankiepll`. Never rely on the current directory's `fly.toml` alone to select a production target.

## Existing safeguards to preserve

- `scripts/deploy-production.sh` is the production deployment gate. It checks branch, clean working tree, synchronization with `origin/main`, app identity, Fly access, required secret *names*, tests, build, deployment, and the public health endpoint.
- `.github/workflows/validate.yml` validates PRs and pushes to `main`; it is a validation workflow, not a production deployment workflow.
- `/api/health` is the configured Fly HTTP health check.
- Telegram approval is a human review gate. Approval is not publication.
- `POSTIZ_AUTO_PUBLISH` must remain disabled unless the user explicitly authorizes enabling automatic publication.
- The Telegram webhook and publication schedules must not be enabled or changed without explicit user authorization.

Do not weaken or bypass the production deployment script to make a deploy pass. Do not silently add a push-to-main production deployment workflow.

## Required preflight

From a clean checkout of this repository:

```bash
fly version
fly auth whoami
fly status -a tworca-shortsow-na-podstawie-newsa-z-bankiepll --json
fly machine list -a tworca-shortsow-na-podstawie-newsa-z-bankiepll --json
fly checks list -a tworca-shortsow-na-podstawie-newsa-z-bankiepll --json
fly volumes list -a tworca-shortsow-na-podstawie-newsa-z-bankiepll --json
fly secrets list -a tworca-shortsow-na-podstawie-newsa-z-bankiepll --json
fly releases -a tworca-shortsow-na-podstawie-newsa-z-bankiepll --json
fly config validate -c fly.toml
```

Secret listing is names/digests only. Never request, print, copy, or commit secret values.

If Fly authentication is unavailable, stop control-plane operations. Do not ask the agent to invent or search for credentials. Report the exact missing authorization and continue only with safe checks such as repository tests and a public HTTP health probe.

## Deployment procedure

A production deployment is allowed only when the user has explicitly requested it and all preflight checks pass.

1. Confirm clean `main`, synced with `origin/main`, and the intended commit.
2. Run `scripts/deploy-production.sh` (do not bypass its gates).
3. Read the final per-Machine deploy result.
4. Verify `fly status`, `fly checks list`, `fly releases`, and recent startup logs.
5. Probe `/api/health` and verify a protected API route rejects unauthenticated access.
6. Report the exact app, release/image, Machine states, health checks, and any remaining warnings.

Never claim a deploy succeeded from command exit status or an HTTP 200 alone. A 200 health response is necessary but does not prove all Machines are healthy.

## Volumes, scaling, and recovery

- A Fly volume attaches to exactly one Machine. Do not add or scale Machines without checking volume topology and explaining the data/availability implications.
- Do not recreate, detach, extend, delete, or migrate `shorts_data` without explicit authorization and a verified recovery plan.
- Do not change Machine size, count, region, autostop behavior, secrets, IPs, certificates, or network exposure as an incidental fix.
- There is no `fly rollback` command. Identify the last known-good image from release history and follow the official skill's rollback procedure. Confirm before a disruptive production rollback.
- Do not run render jobs or publish content as a deployment smoke test.

## Scope boundary

This skill applies to Fly.io infrastructure and deployment operations for this repository only. It does not authorize changes to the Shorts Creator editorial pipeline, financial content generation, Telegram approval policy, Postiz publication, Make.com schedules, or social account settings.
