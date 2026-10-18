# CareVerity Admin

Web admin console for CareVerity, a care management platform. This build covers authentication and account security, company setup and
administration, recruitment, employee onboarding, compliance, training, rota,
payroll, the Live ECM board, supervisor assessments, quality assurance and the inspector portal.

There is no backend yet. Every sign-in, MFA check, invite, and password reset
runs against fixed demo data (`src/app/core/auth/fixtures.ts`) and
`localStorage`. Company and people records are saved on the current device,
with records isolated by workspace.

## Care delivery workspaces

- **Service users** (`/manage/clients`): searchable table/card directory with compact filters and eight records per page, profile photographs, clinical information, capacity/LPA, support preferences, contacts and care-plan summaries.
- **Medication & MAR** (`/manage/clients/:id/medication`): prescriptions, PRN protocols, standard/controlled weekly and monthly MAR, stock, recorded outcomes and audited corrections. Historical medication notes remain in the profile.
- **Visits & Rota** (`/manage/rota`): a home screen with current-week stats, view cards, quick actions and upcoming cover gaps, drafts and conflicts. Schedule, call packages, publishing and history share the same records. The schedule supports staff and service-user calendars, reviewed automatic suggestions, atomic bulk allocation, CSV/Excel export and print/Save PDF.
- **Live Visits / ECM** (`/manage/ecm`): a separate sidebar destination and home-screen card for attendance, running visits, delays and missed calls.
- Each client also has `visits`, `contacts`, `documents`, `family` and `audit` workspace pages. Family previews are linked from active sharing records; direct family views at `/family/:clientId/:accessId` require matching signed-in email, current sharing consent and enabled scopes.

These workflows share the existing workspace-scoped browser store. Document bytes, prescriptions, MAR and messages remain on this device. No backend, external invitation delivery or production family authentication is added. The family view is a permission-scoped demonstration within the existing demo authentication system. Use fictitious records for evaluation.

## Inspector portal

`/inspector/dashboard` opens the dedicated reviewer shell. Its eleven destinations cover
the dashboard, provider, service users, staffing, medication, incidents, quality,
documents, visits, reports and inspector notes. Every signed-in worker role can
open the portal and use its actions within the selected workspace. Inspectors go
directly to the portal after selecting a workspace; the administration sidebar
shows one Inspector Portal link for every role. The portal has its own page navigation and an Admin Console link to return.

The full-access defaults apply to all worker roles across enabled company modules,
including create, edit, delete, export, rota, payroll and evidence-review permissions.
Existing saved permission configurations are upgraded once to version 2. Subsequent
explicit permission edits remain supported. Sign-in, workspace isolation, validation,
paused workflows and checks against approving one's own work remain in place.

The normal Care Worker demo sign-in can open the portal directly. A separate
inspector demo is also available at `/auth/invite/inspector-demo` after signing out.

The portal reads existing workspace records without changing care or workforce
records. Inspection notes, provisional ratings, findings, inspection dates and
uploaded evidence are saved in the workspace's browser store. Drafts detect stale
revisions and retain changes after a failed save. Documents support category,
status, owner and key-question filters, eight-row pagination and ZIP evidence packs
containing original files and a CSV index. Reports export saved content as JSON;
the full report supports browser Print / Save as PDF. Uploads accept non-empty PDF,
PNG, JPEG, text, CSV, DOCX and XLSX files up to 5 MB, subject to browser storage limits.

Counts reflect saved records; empty records do not imply compliance or a regulatory
rating. Coordinates, external notifications and published regulatory reports are
not available in the underlying local data. No regulator submission or remote file
storage is connected.

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
