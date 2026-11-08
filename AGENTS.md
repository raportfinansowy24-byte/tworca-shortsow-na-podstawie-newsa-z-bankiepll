# Repository agent instructions

## Fly.io operations
For any task involving Fly.io, flyctl, `fly.toml`, Machines, volumes, secrets, deploys, health checks, or production operations:

1. Read `skills/fly/SKILL.md` and `skills/fly/PROJECT.md` before acting.
2. Follow the official Fly.io skill and the repository-specific safeguards.
3. Identify the exact production app and inspect state before changing anything.
4. Never expose secret values or put credentials in files, commits, logs, or replies.
5. Do not change publication schedules, Telegram webhook activation, or automatic publishing without explicit user authorization.
6. Do not deploy from a dirty or unsynchronized checkout; use `scripts/deploy-production.sh` for production.
7. Verify Machine state, health checks, release/image, logs, and the public health endpoint after deployment. Report anything not verified.

Do not treat this file as permission to deploy or modify production. Follow the user's explicit task scope and the official skill's confirmation requirements.
