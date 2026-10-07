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

## Payroll & payments

Enable Finance for the company to show **Payroll & payments** in the sidebar.
Company Admin and Finance Officer roles have payroll access by default; Registered
Manager and HR Officer roles can manage and review work. Other roles need access
granted through **Users & access → Permissions → Payroll & payments access**.
The signed-in demo account starts as a Care Worker and initially sees an access
message. Module permissions and payroll-specific permissions both apply.

The module includes Overview, Payroll, Overtime, Contractors, Invoices and
Settings. Payroll contains pay runs, effective-dated staff pay profiles and daily
work records. Only hired people can receive a pay profile. Hourly runs use
approved work; salaried runs estimate a full period from annual salary. An
administrator can add explained adjustments for part-period salary or corrections.

Overtime progresses from authorisation to confirmation of actual hours and
payment approval. Regular work and care allowances need approval before entering
a run. Rates are saved with work records. Configure allowance rates in Settings;
they start at zero. Approval workflows contains role-based routes for overtime,
timesheets, contractor invoices and pay runs. Pausing a route blocks approvals.
Review decisions record the signed-in account and UK timestamp.

Contractors and agencies have rate agreements, contract dates, payment terms and
a responsible manager. Supplier invoices support attachments, multiple lines,
VAT, duplicate checks, work confirmation, finance approval, partial payments and
payment references. The submitter cannot approve their own invoice; pay runs also
require independent sign-off. Employees cannot approve their own work records.

Preparing a pay run reserves approved work so it cannot be included again.
Cancelling a draft releases its work records. Locking requires all outstanding
work to be resolved and regular hours for every hourly employee. Locked runs keep
immutable amount snapshots. CSV exports contain estimated gross amounts; they
are not provider-specific payroll submissions. Exporting does not mark a run paid.
Record payments only after they have been processed externally.

All payroll records are isolated by company and saved on this browser. This is an
admin workflow demonstration: it does not calculate PAYE, National Insurance,
pensions or statutory pay, produce statutory payslips, submit to HMRC, connect to
a payroll provider, or transfer funds. Shared approvals and secure server-side
permissions require a backend. Monetary amounts use GBP and review timestamps
use Europe/London with GMT/BST adjustment.
