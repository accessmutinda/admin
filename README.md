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

## Vacancy application flow

In Recruitment, use **New vacancy** or **Vacancies → Edit form** to configure
opportunity details, additional questions and required or optional document
uploads. The side preview shows the applicant page as you edit. Save the vacancy
with **Accept applications through the public link** enabled, then copy or open
its `/apply/:companyId/:vacancyId` link. Existing demo vacancies need to be saved
through the editor before an application page is available.

The application route does not require sign-in. Successful submissions appear in
the linked workspace's Applied column, including custom responses in Profile and
uploads in Documents. Uploads accept PDF, Word, JPG and PNG files up to 1 MB each.
An optional go-live date opens applications at 00:00 UK time (GMT/BST) on the selected
day when public applications are enabled. Before then, the link shows the vacancy
and its opening date without an application form. Leave it blank to open
immediately. The closing date must be on or after the go-live date. Scheduling uses
`Europe/London` and adjusts automatically for GMT and BST regardless of the
applicant's device timezone.

An optional closing date accepts applications through 23:59 UK time (GMT/BST) on that
day, then shows a closed page and blocks new submissions. Leave it blank for
no deadline. Recruitment refreshes when an application is saved from another tab. Pausing a
vacancy disables its public form while preserving received applications.

Links and applications currently work only in the browser profile and site origin
where the vacancy was saved. Shared links cannot receive applications from other
devices until a backend and shared document storage are connected. The interface
labels this limitation as a device demo.
