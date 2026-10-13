# CareVerity Admin

Web admin console for CareVerity, a care management platform. This build covers authentication and account security, company setup and
administration, recruitment, employee onboarding, compliance, training, rota,
payroll, the Live ECM board, supervisor assessments and quality assurance.

There is no backend yet. Every sign-in, MFA check, invite, and password reset
runs against fixed demo data (`src/app/core/auth/fixtures.ts`) and
`localStorage`. Company and people records are saved on the current device,
with records isolated by workspace.

## Running it

Requires Node `v22.23.3` (see `.nvmrc`) — the system default on most machines
is too old for Angular 22.

```bash
nvm use
npm install
npm start
```

Open `http://localhost:4200`. It redirects straight to sign-in.

Other scripts: `npm run build` (production build), `npm test` (unit tests).

## Docker

Requires Docker with Docker Compose and a running Docker daemon. Run these
commands from the `admin` directory:

```bash
docker compose up --build -d
```

Open `http://localhost:8080`. The image builds the production Angular app with
Node 22.23.3 and serves it with Nginx as a non-root user. Nested routes support
direct navigation and refresh. No local Node installation is required.

To use a different host port, run `ADMIN_PORT=8081 docker compose up --build -d`.
Check status with `docker compose ps`, view logs with `docker compose logs -f admin`,
and stop the app with `docker compose down`.

To build and run without Compose:

```bash
docker build -t careverity-admin .
docker run --rm -p 8080:8080 --name careverity-admin careverity-admin
```

The container health check uses `/health`. This deployment still uses the demo
authentication and browser storage described above; it does not add a backend.

## Design reference

Read [BRANDING-DESIGN-GUIDE.md](BRANDING-DESIGN-GUIDE.md) before changing the UI.
It records the settled shared styles and feature layouts. Update it alongside
agreed design changes. The guide is a local reference and is intentionally ignored
by Git.

## Signing in

| Field    | Value                 |
| -------- | --------------------- |
| Email    | `jane.doe@lqcs.co.uk` |
| Password | `CareVerity123!`      |
| MFA code | `123456`              |
