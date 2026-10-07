# CareVerity Admin

Web admin console for CareVerity, a care management platform. This build covers authentication and account security, company setup and
administration, recruitment, employee onboarding, compliance and training.

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
