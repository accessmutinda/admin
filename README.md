# CareVerity Admin

Web admin console for CareVerity, a care management platform. This build covers authentication and account security, company setup and
administration, recruitment, employee onboarding, compliance, training, rota,
payroll, the Live ECM board, supervisor assessments, quality assurance and the inspector portal.

Authentication calls `https://care.neuraledge.co.ke/api/v1` directly.
Update `API_BASE` in `src/app/core/auth/auth-api.ts` when the API host changes.
Requests include credentials.
The backend must allow the frontend origin through credentialed CORS, trust it for
CSRF, and allow the request headers. Cross-site authentication requires cookies
with SameSite=None and Secure, subject to browser third-party cookie policy.
For direct cross-origin sign-in, `GET /auth/csrf` must return a nonempty
`csrf_token` alongside setting the CSRF cookie. The frontend sends that response
token as `X-CSRFToken`; cookie reading is used only for same-origin API requests.
A response containing only `{ "csrf": "set" }` cannot support cross-origin sign-in.
The development and Nginx proxy configurations remain available for same-origin hosting.

Access tokens stay in memory. Session restoration rotates the refresh cookie;
background refresh does not extend the 30-minute idle deadline. User interaction
reports activity at most once per minute. Server validation errors appear on forms.
MFA uses authenticator codes, including enrolment by setup key. Invitation acceptance calls the API and reloads the profile after joining. Password changes
revoke sessions and require another sign-in. Google sign-in, password recovery and
trusted devices are unavailable in the current API and are hidden from sign-in.

Company users enter their assigned company; only Super Admin can select workspaces.
Until RBAC is implemented, role codes come from `/me.platform_roles`. `PO` is Super Admin and can create companies and select workspaces. `CA` is Company Admin and can only enter the company returned in `/me.company_id`; company creation, the global directory and foreign-company routes are blocked. Unknown roles do not receive administrator privileges. The API must still enforce company boundaries on every request.
Authentication and account security import no sample records. Security history, trusted devices, Google sign-in and password recovery show unavailable until their endpoints exist. Demo installation is disabled at startup and in the staff portal. Workspace lists, assignments and profile identity come only from the API. Legacy demo caches are ignored; local business drafts now use `cv_api_company_details_v1` and `cv_api_company_data_v1`. Missing profile fields are displayed as unavailable. Business sample fixtures remain outside the workspace/profile flow and cannot establish a session. Business records in the remaining modules still use local sample data and browser storage.

## Companies API

Contact Information loads saved channels, all address records and key contacts
from the backend aggregate. Save Changes atomically applies edits, additions and
confirmed removals using version and idempotency headers. Partial setup can be
saved, failures retain unsaved input, and billing inheritance preserves the
independent billing record. Local format checks do not claim postal verification.

Registration & Compliance reads and saves backend records with optimistic
version checks. Evidence upload, replacement, download and removal are authorised
API operations; owner/expiry edits save atomically with the form. Uploaded bytes
are stored in database chunks, with a migration required on the backend. Clearing
compliance fields retains company identity and document history. No scanning
provider is configured, so evidence remains explicitly unverified.

General Information loads the authorised company detail before opening. Stored
identity, registration, description, dates, capacity, staff-size band, head-office
address and audit fields populate both the read view and edit form. Missing facts
remain unrecorded; failed detail requests show an explicit retry state.

Overview statistics use authorised-scope backend aggregates for lifecycle counts,
required-section completion and remaining setup sections. Checklist status indicators use
returned `setup_progress` states: grey for pending or unavailable, orange for in
progress, and green for complete. Card surfaces retain their category colours.
Unavailable integrations are excluded from
completion and task counts. Numeric directory page links are supported.

The existing Companies overview, directory, five-step creation wizard and company
administration screens retain their original UI/UX. `CompaniesApiService` loads
all pages from the documented list endpoints and supplies the existing management
store. Identity and lifecycle values come from the API; unavailable detail and
completion fields are not filled with sample values.

Provisioning uses `POST /platform/companies` with a stable idempotency key for
unchanged retries. The original form remains intact; the implemented backend only
persists its documented subset. The confirmation notes that additional setup fields
still require backend support. No locally fabricated company is added to the list.

Missing endpoints, response fields and full-form persistence requirements are
recorded in the local `backend-MD/03-companies.md` contract for the backend team.
Existing screens/routes and their controls remain in place. Unsupported profile,
status and export writes report that backend support is pending rather than
pretending a server save succeeded. Browser drafts remain local until draft
endpoints are available. Invitation acceptance remains API-backed.

## Care delivery workspaces

- **Service users** (`/manage/clients`): searchable table/card directory with compact filters and eight records per page, profile photographs, clinical information, capacity/LPA, support preferences, contacts and care-plan summaries.
- **Electronic care plans** (`/manage/care-plans`, `/manage/care-plans/:id`): brought-forward details, participation/capacity, 17 LQCS care areas, call-package recommendations, voice transcript review, body observations, linked assessment findings, quality checks, independent approval, version history and formal PDF downloads. Fictional sample plans include approved, draft and submitted versions. Approved instructions feed visit/evidence, family and inspector views according to disclosure settings. Browser transcription depends on browser support. The drafting and quality-review frontends include seeded responses, evidence selection, structured suggestions, reviewer rationale, accept/edit/reject decisions and saved audit history. All nine linked assessment types have structured fields and fictional examples; live provider connections remain separate from this frontend demo.
- **Medication & MAR** (`/manage/clients/:id/medication`): prescriptions, PRN protocols, standard/controlled weekly and monthly MAR, stock, recorded outcomes and audited corrections. Historical medication notes remain in the profile.
- **Visits & Rota** (`/manage/rota`): a home screen with current-week stats, view cards, quick actions and upcoming cover gaps, drafts and conflicts. Schedule, call packages, publishing and history share the same records. The schedule supports staff and service-user calendars, reviewed automatic suggestions, atomic bulk allocation, CSV/Excel export and print/Save PDF.
- **Live Visits / ECM** (`/manage/ecm`): a separate sidebar destination and home-screen card for attendance, running visits, delays and missed calls.
- Each client also has `visits`, `contacts`, `documents`, `family` and `audit` workspace pages. Family previews are linked from active sharing records; direct family views at `/family/:clientId/:accessId` require matching signed-in email, current sharing consent and enabled scopes.

These workflows share the existing workspace-scoped browser store. Document bytes, prescriptions, MAR and messages remain on this device. No backend, external invitation delivery or production family authentication is added. The family view is a permission-scoped demonstration within the existing frontend modules. Use fictitious records for evaluation.

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

The previous demo sign-ins and invitation shortcuts no longer establish sessions.

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

The container health check uses `/health`. Authentication requests are proxied to the API; other modules continue to use browser storage.

## Design reference

Read [BRANDING-DESIGN-GUIDE.md](BRANDING-DESIGN-GUIDE.md) before changing the UI.
It records the settled shared styles and feature layouts. Update it alongside
agreed design changes. The guide is a local reference and is intentionally ignored
by Git.

## Signing in

Use an account provisioned on the API. Demo passwords and fixed MFA codes no longer
work. If prompted, enrol an authenticator or change your temporary/expired password.
The client does not create accounts. Cookie-based authentication requires the proxy;
serving only the static build without forwarding `/api/` will not work.

### Care-plan frontend walkthrough

Open `/manage/care-plans` to search the care-plan register and open a service user’s workspace.
The register uses compact branded summary cards and a combined title, search and status toolbar.
These sample workflows predate API authentication. Their fixture accounts no longer sign in; use server-provisioned accounts once company permissions are supplied by the API.

Mary Wilson (`care-demo-client-1`) has the editable example; Arthur Bennett
(`care-demo-client-0`) provides the submitted approval example; Dorothy Clarke
(`care-demo-client-3`) provides the approved/PDF example. The seed upgrade preserves
existing approved versions and edited wording. Drafting examples are visibly labelled Demo mode.
The full page/flow guide is `../deliverables/care-plan-frontend-guide.txt`.

### Dedicated care-plan workspace

**Fixed identity header:** all individual care-plan pages use
`CarePlanIdentityHeader`, matching `Care Plan Dashboard Overview-3.png`. The
rectangular portrait, person details, Print/Share/More controls and right-hand
Current Care Plan card must remain the same across modules, care areas and edit
mode. Future screen references must not introduce another header variant unless
the user explicitly asks. This supersedes the earlier Overview/Mobility banners.


**Open care plan** opens `/manage/care-plans/:id` within Care Plans. The person/photo/version
summary remains sticky. Main navigation contains only Overview, Care Plan, Assessments,
Body Chart, Quality Review and Review History. Service User destinations are links in
Overview, not care-plan navigation tabs. The former More destinations are direct tabs. The 17 care areas now appear in a **left-hand Care Plan Sections panel** only
while Care Plan is selected. Nutrition & Hydration through Call Package display dedicated
Coming soon panels while those screens are in development. The header Back action returns
to the previous screen, with the register as a fallback for direct entry.
The panel has its own scrolling and vertical keyboard
navigation. Main care-plan modules retain their horizontal navigation.

About Me has a separate **Edit About Me** screen using `CarePlanEditLayout`, the shared
pattern for future editors. Its three steps cover existing data only: Personal Details,
About Me, and Review & Visibility. The edit stepper replaces care-area subtabs while editing.
Click Edit on a card to unlock it, Confirm All to review the current step, Save Changes to
persist the snapshot, or Cancel to retain saved data. Unsaved edits are guarded for both
source navigation and same-route navigation to Review History.

Patient-record management stays under Service Users: Medication/MAR, Visits/Allocation,
Visit Notes, Documents, Contacts, Family Access, risk records, Incidents/Complaints and
Reviews/Feedback. Care Plans provides source-record links and planning summaries, not
embedded copies of these editors. Unsaved care-plan changes are guarded when opening a
Service User record and retained while switching between care-plan tabs.

The care-plan Overview follows `Care Plan Management Dashboard-1.png`, including
four top cards, care package/contact/activity panels and all 17 progress links.
Its seeded Mary Wilson example demonstrates each progress state. Start/Continue
Review reuses an existing draft, even after viewing the approved version. Create
Incident/Compliment/Complaint opens the corresponding source form under Service
Users. Print uses the browser print layout; Share copies the Overview link.

**Care Plan → Mobility** now has a dedicated Dashboard-6 reference screen, including
formatted fields, review metadata, a seeded review-note action, source supporting
PDFs, linked assessment/risk/incident records and separate Save as Draft/Save Section
controls. Its header shows plan metadata and recorded Key Information. Documents
and incidents open their existing source viewers/editors under Service Users.

**Care Plan → Personal Care** uses Dashboard-8's grid/sidebar layout and Dashboard-4's
colours. It includes assistance/equipment checkboxes, all care narrative/review fields,
Edit/Accept/Reject, recording/manual transcript entry and transcript read-aloud.
It preserves the fixed header, approved versions and existing custom instructions.
Related incidents open filtered Service User records; Save Section completes only
the working draft area after validation. See the Personal Care checklist in deliverables.


### Frontend demo: approval, rota handoff and visit evidence

The fourteen unavailable care-area screens remain Coming soon. To demonstrate approval,
finish About Me, Personal Care and Mobility, confirm the review details/capacity/package,
then open **Review History** and select **Use the three-section demo approval workflow**.
Submit the draft. A different manager signs in, types their own displayed name and confirms
that fourteen areas are deferred before approving. The partial scope and demonstration
signature are retained on the version and in the generated PDF; this is not full-plan approval.

For a package-change demonstration, save a Change required recommendation in the current
care-package review. A different manager authorises it. Send the handoff to the rota queue,
then open **Visits & Rostering → Call packages**, enter a simulated completion note and
complete the handoff. The status/history persist; recurring calls and published visits are
not modified by this simulation.

In **Staff portal → Service users → Allocation**, choose an assigned published visit and
open visit evidence. Record outcomes for tasks derived from approved, staff-visible care
instructions, add a note and submit. Managers can return to the person's care-plan
**Quality Review** to see those task/version snapshots and save a review reflection.
Carers can capture only their own assigned published visits. No external service or backend
is required for these local frontend demonstrations.

## CareVerity Academy

Open CareVerity Academy in the Admin Console for courses, media, questions, assignments, results, certificates and reports. Staff Portal has a matching CareVerity Academy dropdown, training summary on the main dashboard, own courses, assessments, historical training records, refreshers and messages. The existing HR training tab offers exact-worker assignment/refresher actions and shows the same Academy evidence.

This is a seeded frontend. A pass automatically generates a local PDF, files it once in the correct worker's Training & Certificates category, updates HR knowledge training and history, schedules renewal, and acknowledges matrix/compliance/rota refreshes. Practical sign-off and its review date remain separate. Academy settings include failure scenarios; the evidence queue supports retry without duplicate artifacts. Workers see their result and status without ordinary internal-PDF download shortcuts, and can record a request for HR-mediated access.

See the [implementation checklist](docs/academy-implementation-checklist.md) and [seeded workflow guide](docs/academy-service-handoff.md) for the demonstration path and verification status. All records and files remain in this browser/workspace; no backend or external delivery is implied.
