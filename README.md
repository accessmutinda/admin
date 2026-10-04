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

Check **Trust this device** on the MFA screen and the next sign-in on the same
browser skips MFA (stored in `localStorage`, per email). Uncheck it, or clear
site data, to see the MFA screen again.

**Sign in with Microsoft** (on the sign-in screen or `/auth/sso/microsoft`)
skips password + MFA entirely and signs you in as the same demo user —
that's the point of SSO.

## Other things to try

- **Forgot password** — any email at `/auth/forgot-password` "sends" a reset
  link (no real email, nothing to click through to).
- **Change password** — `/account/change-password` (signed in only, reached
  from Security settings → Change) asks for your current password first —
  use `CareVerity123!` — then a new one. Wrong current password shows an
  error; success redirects back to Security settings.
- **Invites** — `/auth/invite/demo-invite` is a valid, pending invite;
  `/auth/invite/expired-invite` shows the expired state. Accepting one signs
  you in as the demo user with the invited role.
- **Workspaces** — the demo user belongs to 5 fake companies (shown after
  MFA, or via the switcher in the account header): London Quality Care
  Services, Riverside Care Home, Sunrise Support Services, Meadow View Care,
  Oakwood Community Care.
- **Login history / trusted devices** — `/account/security/login-history` has
  8 seeded login events and 2 trusted devices. Revoking a device needs a
  second click to confirm, and only persists for the current page session
  (no backend to save it to).
- **Access denied** — `/access-denied` is reachable directly; in context it's
  what a role guard redirects to when a route requires a role the signed-in
  user doesn't have.
- **404** — any unmatched route shows a proper "page not found" screen rather
  than silently redirecting.

## What's stubbed vs built

Built: sign-in, MFA, forgot/reset password, SSO explainer, invite accept/
decline, workspace switcher, access denied, security settings, login history.

Stubbed (left nav items with no page behind them yet): Profile, Devices,
Connected accounts, Notifications, Preferences under `/account/security`.

## Swapping in a real backend

Everything fake lives behind `AuthService` and `WorkspaceService`
(`src/app/core/auth/`). Replace the bodies of their methods with real HTTP
calls — the return types and the rest of the app don't need to change.
