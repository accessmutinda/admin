# CareVerity Admin

Web admin console for CareVerity, a care management platform. This build covers authentication and account security, company setup and
administration, recruitment, employee onboarding, compliance, training, rota,
payroll and the Live ECM board.

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

## Live ECM board

Open **Care delivery → Live ECM board**. Published visits appear on their UK
scheduled date, including overnight carryover. The prominent clock ticks every
second, with a separate last-update timestamp. Red and amber totals, care risk
flags, double-up attendance, completed visits, configurable call types, exception
reports and the wallboard all use the same saved visit records.

Use **Demo, mobile & follow-up workflows → Demo setup** to create six linked
sample scenarios, client files, call packages, trained care workers and pay
profiles. Apply queued mobile events manually or play the feed every 10 seconds.
The staff visit preview records actual check-in/out times and supports camera
capture, voice recording, browser dictation, typed notes and sample evidence.
Photo consent is required; sensitive media views and manager reviews are audited.
Concerns create assigned review cases.

Visit details provide follow-up records, dummy SMS/email/in-app notifications,
assigned escalations, rescheduling and manager allocation overrides. Accepted
changed-time requests update unstarted visits while preserving duration and
checking conflicts. Overrides retain the reason and bypassed conflicts in the
audit. Central call defaults cover duration, priority, skills, active status,
labels and colours, and can be applied to client call packages.

The workflows page includes a notification outbox with simulated delivery,
failure and retry; assigned escalation cases with review/resolution history;
and Billing & outcomes with derived KPI totals, completed-attendance payroll
transfer, outgoing client invoice drafts, approval/export and dated CQC delivery
evidence packs. Client billing rates and contact/risk details are maintained in
**Care delivery → Client files**. Invoice amounts retain their attendance and
rate snapshots; repeated billing/payroll transfers skip already included visits.
Evidence-pack downloads contain media metadata rather than photo/voice bytes.

This is a frontend demo with dummy data. Changes persist in the current company's
browser storage and update other open tabs in that browser. Delivery states and
case routing are simulated; there is no cross-device server, real message delivery
or secure remote upload. Browser camera/microphone access requires permission,
and dictation depends on browser support. Use sample information only.
