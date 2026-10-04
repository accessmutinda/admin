# CareVerity Admin

Web admin console for CareVerity, a care management platform. This build covers
**Authentication & Access** — sign in, MFA, password reset, SSO, invites,
workspace switching, and account security settings.

There is no backend yet. Every sign-in, MFA check, invite, and password reset
runs against fixed in-memory data (`src/app/core/auth/fixtures.ts`) and
`localStorage`, so the whole flow is click-through testable on its own.

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

## Signing in

| Field | Value |
|---|---|
| Email | `jane.doe@lqcs.co.uk` |
| Password | `CareVerity123!` |
| MFA code | `123456` |


