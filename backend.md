# CareVerity backend implementation contract

Date: 30 October 2026. Stack: Django, Django REST framework and PostgreSQL.
Status: implementation specification; this document does not add a running backend.

## 1. Scope and non-negotiable data rules

Build the API for the existing application, including management, the staff portal,
family portal, Inspector portal, public applications and all nine Rich KPI dashboards.
Preserve current workflows, fields, permissions, record links and exports when replacing
the browser stores. The retired Staff Portal Dashboard 2 does not need its own API;
its frontend redirect uses the main staff dashboard endpoint.

1. PostgreSQL is the system of record for every business entity, setting, permission,
   catalogue, document version, workflow state and report definition. Lists, selectors,
   cards, charts, tables and counts must query those records through the API.
2. A displayed value must be a stored fact or a reproducible calculation over
   stored facts. Lightweight display calculations may run in the frontend under
   section 9.1.1; authoritative business calculations remain in Django/PostgreSQL.
   Never return hardcoded dashboard percentages, sample employees,
   random trends, fabricated delivery receipts or fixed compliance ratings.
3. Store source facts, events, versioned inputs and calculation definitions only.
   **Do not persist calculated results**: no derived totals, balances, percentages,
   scores, counters, metric snapshots, forecast values or materialised aggregates.
   Calculate results when requested from the current authorised database records,
   in the frontend or backend/database as section 9 specifies. Backend validation
   independently recalculates any result used to accept a business operation; save
   the source inputs and decision event, not the derived number. Clients cannot
   write audit actors or approval outcomes directly.
4. A missing fact is not zero, compliant, paid or approved. Return `null` with an
   explanation when a calculation is unavailable; return zero for a known empty count.
   A percentage with a zero denominator is `null`, not 100%.
5. No production endpoint may fall back to `localStorage`, frontend fixtures, browser
   blobs, sample image records or demo-seeding functions. A disconnected client shows
   a clear unavailable state; it must not silently manufacture a replacement record.
6. Database-backed configuration includes module entitlements, role grants, document
   requirements, assessment templates, rating policies, course rules, rate schedules,
   notification templates and dashboard thresholds. Version these settings.
7. Static presentation code may retain layout, routes, CSS colours and decorative
   icon mappings. Those are not authoritative business data or eligibility rules.
8. Shared entities have one owner: visits belong to scheduling; medication events to
   medication; tasks to communications; evidence to the evidence library. Other
   modules query/link those entities instead of maintaining copies with separate IDs.
9. In the baseline implementation, uploaded file bytes also live in PostgreSQL, in
   immutable chunks referenced by audited file versions. A browser file handle or
   public URL is not a stored document. See section 7.

A source fact is an observed event, entered quantity, answer, payment, approved
rate/target, human assessment or attributed decision. A recorded temperature,
payment amount or survey answer is data; a total, balance, weighted score,
percentage, pass flag or elapsed duration derived from other fields is a calculation.
Store the former, compute the latter. Externally supplied documents/results may be
retained as attributed original evidence; they cannot substitute for live internal
calculations. Do not add writable or stored generated columns for derived figures.
Audit source changes and decision events without copying calculated outputs into
audit JSON. Immutable input versions preserve reproducibility without saving results.

The current `ManagementStore`, domain services and frontend model files are the
field/workflow inventory, not a production security policy. In particular, do not
copy permissive demo role defaults or fixed demo authentication into the backend.

## 2. Architecture and source layout

Use Django 5.2 LTS with a current security patch, PostgreSQL 18 and psycopg 3 as the
implementation baseline. Lock tested Python, Django, REST framework and driver
versions in the backend dependency lockfile. Confirm the supported combination
before deployment rather than copying an old patch number from this document.
Django 5.2 supports PostgreSQL 14 and later; 18 is the selected project baseline.
[Django support](https://www.djangoproject.com/download/),
[Django database support](https://docs.djangoproject.com/en/5.2/ref/databases/).

Add a `backend/` Django project alongside the Angular `src/` directory in this
repository. Suggested apps:

```text
backend/
  manage.py
  config/                  # settings, URLs, ASGI, task worker configuration
  apps/
    common/                # base models, tenancy, errors, idempotency, pagination
    identity/              # users, sessions, MFA, invitations, memberships
    organisations/         # companies, locations, contacts, modules, subscriptions
    access/                # roles, grants, approval definitions
    documents/             # file versions, chunks, scans, document links
    recruitment/           # vacancies, applications, interviews, offers
    workforce/             # staff, employment, checks, availability, leave, reviews
    academy/               # courses, lessons, questions, attempts, certificates, CPD
    clients/               # service-user identity and structured record sections
    care/                  # plans, goals, risks, consent and observations
    medication/            # prescriptions, scheduled doses, MAR and stock ledger
    scheduling/            # call packages, visits, allocations and publishing
    attendance/            # attendance, ECM actions, evidence and escalations
    communications/        # journal, tasks, professional records, concerns
    family/                # consent-scoped external access and family sharing
    finance/               # rates, work, payroll, supplier/client invoices, payments
    quality/               # assessments, statements, audits, evidence and improvement
    inspections/           # inspection drafts, findings, provisional ratings, reports
    reporting/             # live metric queries, forecast definitions, exports
    integrations/          # keys, provider connections, webhooks, import/backup jobs
    audit/                 # append-only business/access events
```

Views authenticate, resolve scope, validate serializers and call a domain service.
Domain services implement transactions and state transitions. Query services produce
lists, dashboards and reports from PostgreSQL, returning source facts or compact
aggregates for permitted frontend calculations under section 9.1.1. Serializers explicitly allow fields;
never expose all model fields or accept audit columns through `fields = '__all__'`.

Use a task worker for scans, scheduled reminders, report generation, imports,
notifications and source-data processing. Job/outbox execution metadata is persisted
in PostgreSQL; business calculation outputs are not.
A broker or cache may be transient infrastructure, but it is never the authoritative
store for records, approvals, notifications or job completion.

Keep a single API contract in generated OpenAPI. Document permissions, query
parameters, request serializers, response serializers, transitions and errors for
every route listed here. This file specifies the required coverage, not a replacement
for executable serializers, migrations and an OpenAPI document.

### 2.1 Mandatory backend and SQL engineering standards

Always apply current, production-grade Django, REST API and PostgreSQL best
practices throughout implementation, reviews, migrations, maintenance and fixes.
Use official documentation for the pinned versions, maintained dependencies and
reviewed project conventions. Choose approaches based on correctness, security,
clarity and measured performance rather than shortcuts or a blanket claim that
one technique is always fastest. These standards supplement every section below;
they do not override the source-data-only storage rule or tenant/audit requirements.

**Backend implementation**

- Keep views/serializers focused on transport and input/output validation; put
  business rules in explicit, reusable domain services and scoped query services.
  Avoid duplicated rules across endpoints, hidden side effects in signals and
  generic abstractions that obscure permissions or transactions.
- Deny access by default. Authenticate and enforce tenant, role, object and field
  permissions server-side on every path, including bulk actions, jobs, search,
  downloads and exports. Use least-privilege service/database accounts, protected
  secrets, secure session/CSRF handling and bounded request/upload/rate limits.
- Explicitly allow writable fields, validate types/ranges/relationships and reject
  mass assignment of actors, tenant IDs, derived values or protected states. Keep
  error contracts consistent; never expose internal exceptions or sensitive data.
- Use short, explicit transactions for related writes; enforce concurrency with
  appropriate row locks, optimistic versions and idempotency. Never hold database
  locks while waiting for external network calls. Persist source writes, audit and
  outbox atomically; make workers retry-safe and external failures observable.
- Keep dependencies patched and pinned, configuration environment-specific and
  secrets outside source control. Require structured redacted logs, correlation
  IDs, useful health checks and operational metrics without private payloads.
- Test permission boundaries, real PostgreSQL behaviour, failure paths and
  concurrent writes. Review security and query behaviour alongside functionality;
  code review and CI must enforce these requirements before release.

**SQL and database implementation**

- Model source facts relationally with appropriate types, primary/foreign keys,
  NOT NULL, CHECK, unique and exclusion constraints. Enforce same-tenant links and
  valid effective ranges in the database where possible. Use JSONB for justified,
  validated extensions, not as a replacement for relational design.
- Prefer Django ORM queries when they express the operation clearly. Raw SQL must
  be justified, reviewed and parameterised; never concatenate or interpolate
  untrusted values. Bind values as parameters and allowlist/quote identifiers
  through supported APIs because identifiers cannot be ordinary value parameters.
- Scope querysets before joins, aggregation, pagination and counts. Select only
  needed fields; avoid unbounded lists, unnecessary `SELECT *`, N+1 queries and
  duplicate-producing joins. Use `select_related`/`prefetch_related`, batched work
  and set-based SQL where appropriate without bypassing audit or validation.
- Design indexes for actual tenant-scoped filters, joins and ordering. Inspect
  query plans and realistic data volumes before adding or changing indexes; check
  write/storage costs as well as reads. Use `EXPLAIN` safely and run
  `EXPLAIN ANALYZE` only where executing the statement and its load is acceptable.
- Define null, timezone, decimal, rounding and interval semantics explicitly. Use
  exact decimal money, deterministic ordering and correct aggregation grain;
  prevent double-counting across joins and handle empty denominators honestly.
- Calculate from current source records with bounded queries or non-materialised
  views. Do not introduce stored totals, generated result columns, materialised
  views or persisted calculation caches as a performance shortcut. Optimise source
  indexes, query shape and frontend display arithmetic instead.
- Write reviewed, version-controlled migrations. Assess lock duration, deployment
  compatibility and data volume; use staged expand/backfill/validate/contract
  changes and online index operations where appropriate. Never run destructive
  schema changes or uncontrolled full-table backfills as an incidental request.
- Use stable lock ordering, bounded deadlock/serialization retries, connection and
  statement limits, and database-maintenance/backup monitoring. Test restore and
  reconciliation rather than assuming a successful backup job guarantees recovery.

For each implementation change, document relevant permissions, transaction and
concurrency behaviour, constraints/indexes, migration impact and validation evidence.
If a proposed optimisation conflicts with correctness, tenant isolation, audit
integrity or live calculations, revise the design before merging it.

## 3. Tenant ownership and permissions

`company` is the tenant/workspace boundary. All company-owned rows, including join
tables, source revisions, file chunks, ledger entries, tasks and audit events, carry a
non-null `company_id`. Branch/location access further restricts a company queryset.
Global users, authentication records and platform catalogues are explicit exceptions.
The company root row uses its own `id` as tenant identity rather than a self-reference.

Use `/api/v1/companies/{company_id}/...` for company APIs. The path is a requested
scope, not proof of access. Verify active membership, module entitlement, action
permission and object/branch assignment on every request. Never trust a body field,
selected-workspace cookie or frontend role label to authorise access.

Default deny. Support the existing role codes `PO`, `CA`, `RM`, `CC`, `CW`, `FS`,
`QA`, `HR`, `FN`, `TM`, `CO`, `IN` as initial database catalogue entries. Actual
permissions are explicit grants, not hardcoded assumptions that every worker can
view payroll, change roles or approve evidence. Platform cross-company access
requires an explicit platform permission and a recorded reason.

Filter querysets before pagination, counts, search, downloads, exports, realtime
streams and aggregates. Validate same-company relationships on create/update and
check custom actions explicitly. REST framework object checks alone do not filter
a list queryset. [REST framework permissions](https://www.django-rest-framework.org/api-guide/permissions/).

Enforce same-tenant foreign keys at the database layer where possible with
`UNIQUE(company_id, id)` on targets and composite foreign keys on owned references.
A normal FK to a globally unique UUID does not prove tenant ownership. Use migrations
for database constraints the Django field declaration cannot express directly.

Enable PostgreSQL row-level security on tenant tables as an additional boundary.
Use a non-owner runtime role without superuser or `BYPASSRLS`, force RLS where
needed, and set tenant context transaction-locally after authorisation. Include both
read predicates and write checks. Missing context must fail closed; reset pooled
connections and set context for workers and exports too. Table owners normally
bypass ordinary RLS; privileged recovery jobs need a separate audited role.
[PostgreSQL row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).

Family users are authorised through verified, active client grants, not ordinary
staff access. Inspector source access is read-only unless a separate explicit
permission allows a domain mutation; inspection notes/findings have their own
write grants. Staff self-service limits records to the user-linked staff member
and currently assigned clients/visits. Do not expose HR or clinical details merely
because a person has a company membership.

## 4. Mandatory audit columns and database conventions

### 4.1 Common columns

Every concrete table below includes **A**. Every tenant-owned table also includes
**T**. These columns are physical schema columns, including on explicit M2M through
models and job/ledger tables; do not rely on Django's unaudited implicit M2M tables.

| Set | Column | PostgreSQL type | Rule |
| --- | --- | --- | --- |
| A | `id` | `uuid PRIMARY KEY` | Server-generated identity; never a browser-generated tenant authority |
| A | `created_at` | `timestamptz NOT NULL` | Server/DB time; immutable |
| A | `updated_at` | `timestamptz NOT NULL` | Set on every successful mutation |
| A | `created_by_id` | `uuid FK users`, nullable only for defined bootstrap/pre-auth paths | Server-resolved actor, immutable |
| A | `updated_by_id` | `uuid FK users`, same limited nullability | Last authenticated/service actor |
| A | `deleted_at` | `timestamptz NULL` | Used only on resources that permit soft deletion |
| A | `deleted_by_id` | `uuid FK users NULL` | Required when `deleted_at` is populated |
| A | `version` | `bigint NOT NULL DEFAULT 1 CHECK (version > 0)` | Monotonically increasing optimistic-lock version |
| A | `source` | `varchar(32) NOT NULL` | `web`, `worker`, `import`, `integration`, `system`; server assigned |
| A | `request_id` | `uuid NOT NULL` | Request or job correlation ID for the last write |
| T | `company_id` | `uuid NOT NULL FK companies` | Indexed, immutable after creation |

Actor FKs use `PROTECT` or an approved identity-retention/pseudonymisation process,
not cascading deletion of care/financial history. Workers use dedicated service
principals. Public submissions record a controlled intake principal plus the external
actor context in the audit event. Only tightly defined bootstrap/pre-auth records
may have no user FK; an audit event still records actor type and request context.
Never accept actor IDs from an external JSON payload.

Append-only tables still include A/T. Their `updated_at`/`updated_by_id` equal their
creation values, `version = 1`, and deletion columns remain null. Deny updates/deletes
on those tables to the application role. Corrections create linked replacement or
reversal rows. Do not recursively create audit events for inserting audit events.

An abstract model expresses the common fields; it does **not** implement the audit
policy by itself:

```python
class AuditedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT,
        related_name='+', editable=False,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT,
        related_name='+', editable=False,
    )
    deleted_at = models.DateTimeField(null=True, editable=False)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT,
        related_name='+', editable=False,
    )
    version = models.PositiveBigIntegerField(default=1, editable=False)
    source = models.CharField(max_length=32, editable=False)
    request_id = models.UUIDField(editable=False)

    class Meta:
        abstract = True


class TenantModel(AuditedModel):
    company = models.ForeignKey('organisations.Company', on_delete=models.PROTECT)

    class Meta:
        abstract = True
```

Null actor fields in this base support bootstrap; services and DB constraints enforce
the stricter resource-specific requirements. Set timestamps/actors/version explicitly
for bulk operations. `auto_now`, signals or overriding `save()` alone will miss
`QuerySet.update()`, bulk writes or direct SQL. Use restricted write services plus
DB constraints/triggers for invariants, immutable fields and append-only records.

### 4.2 Types, constraints and indexes

Use `date` for birthdays, due dates and service dates; `timestamptz` for events;
`numeric(14,2)` for GBP amounts; `numeric(14,4)` for rates/quantities and scored
measurements when required. Serialise decimals as strings and round at a documented
calculation boundary. Store entered duration/quantity inputs in integer
seconds/minutes or Decimal hours; derive actual elapsed duration from event
timestamps on read. Never use binary floating-point money. Status fields use
validated choices plus DB checks.

Use typed columns and related tables for searchable domain facts. JSONB is reserved
for versioned form answers, configurable extension fields, immutable source revisions,
provider payloads and policy parameters with a validated schema version. Do not
store the entire former `WorkspaceData` object as one JSONB row.

Add tenant-prefixed indexes for `(company_id, status)`, `(company_id, client_id,
created_at)`, `(company_id, staff_id, due_date)`, period/date filters, foreign keys,
and deterministic pagination order. Add targeted search indexes for actual query
patterns. Every live business reference is unique within its company; use partial
unique constraints for soft-deletable references where reuse is approved. Include
`company_id` in uniqueness tests and indexes, not only in an ORM filter.

Use `CheckConstraint`, `UniqueConstraint` and appropriate PostgreSQL constraints
for valid amounts, dates and unique relationships. Validation errors must map to
stable API errors rather than an unhandled database exception.
[Django constraints](https://docs.djangoproject.com/en/5.2/ref/models/constraints/).

### 4.3 Audit event ledger

`audit_events` is append-only and contains A, tenant context where applicable,
`actor_type`, `actor_id`, `action`, `resource_type`, `resource_id`, `parent_id`,
`event_at`, `reason`, `before_version`, `after_version`, `changed_fields`, redacted
`before`/`after` JSONB, `correlation_id`, `ip_address inet` and `user_agent` where
appropriate. Global sign-in events may have no tenant; a company audit reader must
never receive global or another company's events.

Write a business change and its audit event in the **same transaction**. Record
create, update, transition, approval, rejection, signature, reopening, correction,
archive, permission changes, file access, sensitive record reads and exports.
Never audit passwords, MFA secrets, reset/invite tokens, full API secrets or raw
attachment bytes. Sensitive change details require separate audit-view permissions.

Do not replace this ledger with `updated_at` or editable arrays on business rows.
Use independent backups/controlled archival and restricted DB privileges for
retention and tamper investigation; a checksum alone is not tamper-proof storage.

## 5. Common API contract

### 5.1 Paths and method shorthand

Global prefix: `/api/v1`. In the domain tables below, **C** means
`/api/v1/companies/{company_id}`. Paths beginning `/auth`, `/me`, `/public`, `/family`,
`/platform`, `/schema` or `/health` are relative to `/api/v1`, not C.

Resource method sets are exact endpoint expansions:

| Set | Collection path `P` | Detail path `P/{id}` | Extra action |
| --- | --- | --- | --- |
| R | `GET P` | `GET P/{id}` | None |
| RC | `GET P`, `POST P` | `GET P/{id}` | Append-only/new-version resources |
| RCU | `GET P`, `POST P` | `GET P/{id}`, `PATCH P/{id}` | Draft/master-data edits only |
| RCUA | `GET P`, `POST P` | `GET P/{id}`, `PATCH P/{id}` | `POST P/{id}/archive` with reason |
| Singleton | `GET P`, `PATCH P` | No detail route | Version required for mutation |

These definitions enumerate the CRUD endpoints without repeating identical verbs
for every row. Child-resource paths use parent IDs shown in their path. Unlisted
`PUT`/`DELETE` operations return 405. Financial, clinical, evidence and published
learning records are never hard-deleted by generic CRUD. Account/session/token
revocation is an explicit exception with a named action.

Every listed command in later tables is a separate endpoint; commands may not be
simulated by patching a `status`, `approved_by`, `signature` or calculated-total field.
Expose `GET {resource}/{id}/audit` for audited business resources, with scoped event
pagination. Internal join tables and blobs are manipulated through their owning
resource, not an unrestricted generic table API.

### 5.2 Filters, pagination and responses

List endpoints support documented filters: `search`, `page`, `page_size`, `ordering`,
`status`, `branch_id`, `staff_id`, `client_id`, `date_from`, `date_to`, `updated_since`
when relevant. Reject unknown filter/order fields. Filter and authorise before
counting. Default to eight rows; company directory may default to ten. Maximum page
size is 100. Stable ordering always includes `id` as a tie-breaker. Export jobs use
the full authorised filtered set, not only the current page.

```json
{
  "count": 18,
  "next": "...page=2",
  "previous": null,
  "results": [],
  "meta": {
    "company_id": "uuid",
    "filters": {"status": "open"},
    "as_of": "2026-10-30T09:00:00Z",
    "request_id": "uuid"
  }
}
```

That example illustrates the envelope; a real response must contain the matching
rows and actual count. Detail responses include `id`, `version`, relevant audit
metadata and permitted domain fields. They exclude internal secrets and fields the
caller cannot read. Use RFC 3339 UTC event timestamps; display in the company's
IANA timezone, initially `Europe/London` for the current care workspaces.

Return validation errors with `code`, `detail`, `field_errors` and `request_id`.
Use 201 for creation, 202 plus a job ID for queued work, 204 for successful revocation
without a body, 400 for validation, 401 for authentication failure under the chosen
authentication class, 403 for denied actions, 404 for unavailable/cross-tenant objects,
409 for invalid state/idempotency conflict, 412 for stale versions, 428 for missing
required preconditions and 429 for throttling. Configure the authentication class
and exception handler to match this contract rather than relying on inconsistent
default error shapes.

### 5.3 Concurrency, transactions and idempotency

Return `ETag: "v7"` for version 7. Mutations require `If-Match: "v7"` and use an
atomic version check/increment; stale updates fail with 412 and preserve the draft
in the client. A version number checked before a separate unlocked write is unsafe.

Require `Idempotency-Key` on financial posting, visit generation/publication,
attendance intake, medication recording, import commit, attempt submission and
notification commands. Store company, actor, route, request-body digest, state and
resulting source-resource references in `idempotency_records`, not calculated
response bodies. The same key/body reuses the original operation without repeating
side effects and recalculates response fields from the appropriate source versions;
a different body returns 409. Database uniqueness is still required for source links.

Lock the relevant rows and perform validation, state change, related ledger writes,
version increments, audit events and outbox inserts inside `transaction.atomic()`.
For multi-row actions, lock in a deterministic order. Fail an atomic batch as a
whole and return all resolvable conflicts; do not leave half a published rota or
partially allocated pay run. Retry bounded deadlocks/serialization failures safely.
[Django transactions](https://docs.djangoproject.com/en/5.2/topics/db/transactions/),
[row locking](https://docs.djangoproject.com/en/5.2/ref/models/querysets/#select-for-update).

Use an outbox row in the transaction for external delivery. Dispatch after commit;
`on_commit()` may wake a worker, but cannot replace the durable outbox. Store actual
provider outcomes. A failed email does not undo a committed care note; the delivery
record becomes failed/retryable and the UI reports that distinction.

## 6. Required relational schemas

The fields below are the minimum domain columns **in addition to A/T from section 4**.
`FK` means an owned, validated relationship; `?` means nullable. Use explicit
through models for every many-to-many relationship. Add appropriate length/range
checks in migrations; references to status/policy values resolve to validated
choices or versioned database catalogue entries. This is a schema design to turn
into Django models/migrations, not permission to omit the frontend's existing fields.

### 6.1 Identity and security

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `users` | A, global | Normalised unique email, password hash, display name, verified-email timestamp, active flag, principal type `person/service`, locale, timezone; no role grants stored as a single global role |
| `external_identities` | A, global | User FK, provider, issuer, subject, last authenticated timestamp; unique issuer/subject; do not link accounts on an unverified email match |
| `auth_sessions` | A, global | User FK, hashed session identifier, issued/expiry/last-used timestamps, MFA verification time, revoked timestamp/reason, device/IP metadata |
| `mfa_devices` | A, global | User FK, method, encrypted secret or provider credential reference, confirmed timestamp, revoked timestamp; secrets never returned by ordinary reads |
| `recovery_codes` | A, global | User FK, code digest, credential-set identifier and revoked timestamp; single use enforced by a unique immutable consumption row, never a client-editable used flag |
| `auth_challenges` | A, global | User FK?, purpose, token digest, expires_at, attempt count, consumed_at; purposes include email verification, MFA and password reset |
| `trusted_devices` | A, global | User FK, device-name, token digest, issued/expiry/revocation timestamps; not a bypass of revoked sessions or account policy |
| `login_events` | A, global, append-only | User FK?, attempted-account digest, method, success/blocked outcome, event time, observed IP/device, optional verified geo lookup; unknown location stays null |
| `user_preferences` | A, global | User FK unique, last-selected company FK?, notification and display preferences; selection never grants membership |
| `memberships` | A + T | User FK, staff FK?, membership type, status, department, joined/revoked timestamps; unique company/user for the active membership |
| `roles`, `role_permissions`, `membership_roles` | A + T each | Role code/name; role-to-permission through rows with scope; membership-to-role through rows; explicit unique relationship constraints |
| `permission_definitions` | A, global | Unique code, module code, resource/action, description, allowed scope types; seeded catalogue, read from DB |
| `invitations` | A + T | Invited email, intended membership/role/grant, token digest, expiry, accepted/revoked timestamps, inviter, delivery FK; acceptance checks the verified signed-in identity |

### 6.2 Organisation, settings and approvals

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `companies` | A, tenant root | Unique code, legal/trading names, registration, sector, description, established date, active status, language, operational timezone, registered places, country/region, profile fields and modification metadata |
| `company_addresses` | A + T | Address kind, name, lines, town, county, postcode, country; unique live address kind where the UI requires one |
| `company_contacts` | A + T | Contact role/type, name, position, email, phones, primary flag; role-specific uniqueness where applicable |
| `service_locations` | A + T | Branch/site reference, name, address, type, manager staff FK?, opening dates, active flag, coordinates and coordinate source if actually recorded |
| `company_branding_versions` | A + T | Version number, palette, logo/file versions, tagline, validated theme JSONB, publication status, published timestamp/actor; immutable published versions |
| `message_templates`, `document_templates` | A + T each | Template key, subject/body/layout, schema/version, draft/published state, approved file/branding version links |
| `module_catalog`, `addon_catalog`, `subscription_plans` | A, global each | Codes, names, descriptions, supported features and validated plan limits; database catalogue rather than frontend arrays |
| `company_modules` | A + T | Module FK, enabled status, effective dates, configuration version; unique current company/module |
| `company_subscriptions` | A + T | Plan FK, recorded status, billing cycle, renewal date, limits, support level, notes; historical effective versions |
| `addon_requests` | A + T | Add-on FK, requested/trial-requested state, requester, decision and decision reason |
| `subscription_invoices` | A + T | Reference, issued/due dates, currency, amount, state, provider reconciliation reference; payments use auditable accounting records |
| `company_compliance_records` | A + T | Requirement/type, registration/check values, valid-from/to, owner, review state, evidence file-version FK and verification decision |
| `workflow_definitions`, `workflow_steps` | A + T each | Workflow key, version, active dates; ordered approval steps, eligible roles/users, self-approval rule, escalation delay, notification policy |
| `approval_requests`, `approval_decisions` | A + T each | Owned resource link, frozen workflow version, requested action, current step; append-only decisions with outcome, actor, reason and time |
| `workspace_drafts` | A + T | Owner user FK, draft kind, schema version, validated JSONB, current step, expiry; used for company/staff setup, not as a live record store |
| `company_settings` | A + T | Unique setting key/version, typed validated value, effective dates; includes operational thresholds, retention policy reference and backup preferences |

### 6.3 Recruitment and workforce

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `vacancies` | A + T | Reference, title, branch, employment type, description, salary/range, publication state, go-live/closing dates and hiring owner |
| `application_fields`, `application_document_requirements` | A + T each | Vacancy FK, field key/type/options/required/order; required document type and validation limits; versioned definitions |
| `applications` | A + T | Vacancy FK, applicant identity/contact fields, submitted time, stage, source, consent fields and duplicate-submission key |
| `application_answers`, `application_documents` | A + T each | Application FK, frozen field definition/value; requirement FK and file-version FK; no answers hidden in staff notes |
| `application_stage_events`, `interviews`, `offers` | A + T each | Application FK; previous/next stage/reason; interview schedule/panel/outcome; offer terms, decision and accepted date |
| `staff` | A + T | Optional user/application FKs, unique reference, status, branch, first/middle/surname, title, DOB, phone, address, postcode, demographic fields, photo/file FK; restricted sensitive fields |
| `staff_contacts`, `staff_languages` | A + T each | Staff FK; next-of-kin/emergency relationship and phone alternatives; language and proficiency/preferences |
| `employment_terms` | A + T | Staff FK, effective range, type, department, line manager FK, contracted hours, rate reference, payroll number, probation, contract end, notice and history/gaps; non-overlapping active terms |
| `staff_preferences` | A + T | Staff FK unique current row, areas/travel/shifts/client groups, live-in preferences, driver/vehicle details, notes |
| `availability_rules`, `availability_exceptions` | A + T each | Staff FK, weekday/local time or dated range, available/preferred/unavailable state, timezone; support existing weekly slots and custom times |
| `staff_checks` | A + T | Staff FK, requirement FK, recorded/verified/not-required state, completed/expiry dates, reviewer, evidence version, reason |
| `staff_references` | A + T | Staff/application FK, referee details, requested/received/verified state, verified-by/time, evidence link |
| `induction_templates`, `induction_items` | A + T each | Versioned task definitions; staff FK, template-item version, completion state, completion actor/time, evidence |
| `staff_training_records`, `training_bookings` | A + T each | Staff/course FK, completed/expiry dates, assessor, attributed external competency outcome/score evidence, certificate FK, reassessment due; booking type/date/provider/state |
| `staff_actions`, `staff_requests`, `staff_notes` | A + T each | Staff FK, owner, due date, state, evidence/resolution; request title/fulfilment; note text, reflective flag, author and confidentiality |
| `leave_requests`, `leave_entitlement_rules` | A + T each | Staff FK, type, date/time range, requested amount, approval state, reason; effective allowance/accrual rules and carry-over policy |
| `reviews`, `review_competencies` | A + T each | Staff/assessor FKs, review type, scheduled/review/completed dates, discussion/outcome/state; named competency, scale and human-entered observation/rating (not a calculated aggregate) |
| `performance_goals`, `recognition_entries` | A + T each | Staff FK, goal/target/evidence/review dates/outcome; recognition category, note, author and approved publication scope |

Hiring creates/links a staff row through one transaction; it must not duplicate the
application or replace its history. A user, applicant and staff record are distinct
identities with explicit links. Employment, pay and availability are effective-dated.

### 6.4 Training Academy and development

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `academy_courses`, `academy_course_versions` | A + T each | Stable course key; immutable published title/description/category, mandatory flag, CPD hours, pass mark, validity, publication state, sample flag and thumbnail FK |
| `academy_lessons`, `academy_lesson_versions` | A + T each | Course-version FK, order, title, expected duration, content/transcript, video/thumbnail/caption/file versions; unique ordered lesson per version |
| `academy_questions`, `academy_question_versions` | A + T each | Course/lesson version, question type/text/scenario, difficulty, category, weight, required/shuffle flags, explanation/feedback, image/file version |
| `question_options`, `question_answer_keys`, `question_tags` | A + T each | Question-version FK; ordered option text; correct-option relationships; explicit tag rows. Answer keys are server-only |
| `academy_settings_versions` | A + T | Attempts/time/pass rules, reminders, sequential lessons, self-enrolment, feedback, certificate template and issuer/branding/signature file versions |
| `academy_assignments` | A + T | Staff/course-version FK, assigner, assigned/due/completed times, recurrence, archived flag; uniqueness policy prevents unintended duplicate active assignment |
| `lesson_progress` | A + T | Assignment/lesson-version FKs, saved position, notes, completion evidence/time; unique assignment/lesson |
| `academy_attempts` | A + T | Assignment/staff FK, frozen question set and rules, started/deadline/submitted times, attempt number and feedback policy; score/pass are computed from submitted answers on read, never stored |
| `attempt_questions`, `attempt_answers` | A + T each | Attempt FK, frozen question/version and order; selected options and saved times; answers editable only before submission/deadline |
| `academy_certificates` | A + T | Unique reference, passed-attempt FK, staff/course/rule versions, CPD credit terms, issued/expiry dates, sample flag and issuer/branding version; score and certificate rendering calculated on demand |
| `cpd_entries` | A + T | Staff FK, activity, provider, date, Decimal hours, reflection, evidence/certificate FK, verification state and optional unique source award |
| `academy_notifications` | A + T | Assignment/staff FK, reminder key/type, notification FK, due/sent state; unique reminder key prevents duplicate reminders |

Quiz completion and sample certificates are not verified clinical competency.
Competency sign-off remains a separate workforce/quality record with an assessor.

### 6.5 Service users and care records

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `clients` | A + T | Reference, identity/demographics, address/postcode, contact details, branch, funding type, priority, active/admission/discharge dates, photo version, key-worker FK |
| `client_contacts` | A + T | Client FK, family/emergency/GP/pharmacy/professional type, name/organisation, relationship, phones/email, next-of-kin flag |
| `client_staff_assignments` | A + T | Client/staff FKs, assignment role, effective dates and continuity preference |
| `client_field_definitions`, `client_section_revisions` | A + T each | Versioned extension-field schema/key/type/options; client FK, section key, validated values, recorded/effective dates, author and supersedes FK |
| `diagnoses`, `allergies`, `communication_needs` | A + T each | Client FK, structured category/code/name, practical support/clinical notes, severity where recorded, assessment/review dates, active/resolved state |
| `care_plans`, `care_plan_versions` | A + T each | Client FK; title, care needs, support/interventions, start/review dates, draft/active/archived state, approved-by/time and signature references |
| `care_goals`, `goal_measurements` | A + T each | Plan-version/client FK, personally agreed target, domain, baseline, target date, unit/direction; dated observations and goal outcome with evidence |
| `risk_assessments`, `risk_reviews` | A + T each | Client FK, risk type, versioned assessment method, recorded severity/likelihood, mitigation, owner, assessed/review dates and review outcome |
| `moving_handling_plans` | A + T | Client/plan version, assistance level, equipment, transfer instructions, assessed/review dates |
| `capacity_assessments`, `legal_authorities`, `consents` | A + T each | Client FK, decision/purpose, capacity outcome and assessor; LPA/representative scope and evidence; consent purpose, decision, start/expiry/revocation and evidence |
| `client_access_instructions`, `support_preferences` | A + T each | Client FK, restricted access/keys/security instructions; personal, cultural, religious, gender/carer/time preferences and life-story content |
| `care_tasks`, `care_task_completions` | A + T each | Client/plan FK, task definition/schedule; visit/staff FK, outcome and recorded time, linked observations |
| `care_observations`, `clinical_reviews` | A + T each | Client/visit FK?, domain, observed value/unit/time, author, escalation/review need; medication/wound/nutrition/continence/end-of-life/MCA/DoLS review type, due/completed time and outcome |
| `wellbeing_activities`, `activity_participation` | A + T each | Activity type/date/branch/owner; client FK, choice/participation, observed outcome and evidence |
| `referrals`, `hospital_events` | A + T each | Client FK, referral received/accepted/service-start dates and state; admission/A&E/avoidance event, occurrence time, recorded rationale, supporting professional review |

Import the current `CLIENT_SECTIONS`/field definitions into a versioned database
catalogue: overview, details, diagnoses, plan, risks, moving, capacity, consent,
medication, allergies, access, tasks, family, support and documents. Keep relational
models above for core facts; typed section revisions cover the remaining validated
record fields. Do not turn medication, contacts, care goals or risk entries back
into opaque dictionaries. The medication/family/documents sections query their
own tables through the client API.

### 6.6 Medication and MAR

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `prescriptions`, `prescription_versions` | A + T each | Client FK; medicine/name/strength/form/route/dose, frequency, start/end, prescriber/pharmacy, indication, support level, controlled/requires-MAR flags, stock location, monitoring/covert authority and notes |
| `dose_schedules` | A + T | Prescription-version FK, weekdays/local time, timezone, effective range; PRN prescriptions do not create scheduled doses |
| `dose_occurrences` | A + T | Prescription/schedule version, scheduled instant, service date and planned dose; unique prescription-version/scheduled instant |
| `prn_protocols` | A + T | Prescription-version FK, indication, maximum amount, interval/window, response monitoring and approval state |
| `medication_administrations` | A + T, append-only | Prescription-version/client FK, dose-occurrence FK?, visit FK?, actual time, outcome, Decimal dose units, reason/response, administering staff, verified witness FK?, supersedes FK? |
| `medication_corrections` | A + T, append-only | Original/new administration FKs, reason, actor and approval metadata; original record remains accessible |
| `medication_stock_movements` | A + T, append-only | Prescription/product/client FK, receipt/administration/adjustment/reversal type, signed quantity, unit, lot/expiry where recorded, source-administration FK?, reversal FK? |
| `medication_reviews` | A + T | Client/prescription FK, review type, due/completed date, reviewer, outcome, next review and evidence |

Stock is the sum of the authorised ledger, not an editable running number supplied
by the browser. Dose outcomes and stock movements commit together. Corrections
supersede records and post compensating stock movements where needed. Preserve
standard/controlled views and schedule-preview semantics: scheduled is not given.

### 6.7 Scheduling, attendance and ECM

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `call_packages`, `call_package_versions` | A + T each | Client FK, name/type, weekdays, local start/end/duration, timezone, carer count, tasks, required skills, priority, flexibility/tolerance, travel, driver and active/effective dates |
| `call_regular_staff`, `call_requirements` | A + T each | Package-version/staff through rows with effective dates; required skill/risk/task references and backup-carer relationship |
| `visits` | A + T | Client/call-version FK, planned start/end instants, local service date, branch/location, required carers, draft/published/cancelled state, priority and cancellation reason |
| `visit_allocations` | A + T | Visit/staff FK, regular/temporary role, coverage interval, active state, override decision FK?; unique live visit/staff allocation |
| `allocation_reservations` | A + T | Staff/allocation FK, `tstzrange` occupied interval, active/approved-override state; prevent unapproved overlapping reservations |
| `allocation_overrides`, `rota_publications` | A + T each | Conflicts, authorised reason/actor/time; publication scope and exact visit/allocation source versions; no computed summary |
| `attendance_events` | A + T, append-only | Visit/staff FK, check-in/out kind, occurred/received times, source, verified location/evidence if captured, external source key and correction reference |
| `attendance_corrections` | A + T, append-only | Original event FK, replacement event FK, reason and authorised reviewer; never silently edit actual attendance |
| `ecm_actions`, `ecm_escalations` | A + T each | Visit FK, action/contact/outcome/ETA/follow-up; severity, owner, due time, open/in-review/resolved state and resolution |
| `visit_evidence`, `ecm_reviews` | A + T each | Visit FK, care-note/safeguarding/wound/concern category, note, photo/audio file versions, transcript/source; reviewer/time/outcome |
| `call_style_definitions`, `ecm_policy_versions` | A + T each | Call-type labels/presentation and supported requirements; effective lateness/risk/missed thresholds and escalation policy |
| `visit_preferences`, `service_change_requests`, `emergency_cover_requests` | A + T each | Client/package FK, preferred times/carers; requested change, received/responded/implemented times and outcome; urgent request, offered/accepted cover and resolution times |

Use PostgreSQL range/exclusion constraints for ordinary overlapping reservations,
with `btree_gist` where required. Approved exceptions remain explicit exceptions,
visible to conflict queries. Availability, leave, skill expiry, client preferences,
travel and carer coverage require service-level validation and appropriate locks;
an exclusion constraint alone does not check them.
[PostgreSQL ranges](https://www.postgresql.org/docs/18/rangetypes.html).

### 6.8 Communications and staff portal

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `journal_entries` | A + T | Author/user, optional client/visit, message/internal-note kind, subject, category, priority, sanitised body and safe rich-text representation, draft/sent state, response requirement, sent time, reply/thread FK |
| `journal_recipients` | A + T | Entry FK, recipient user/contact, to/cc type, delivered/read time, starred/archived/deleted-for-recipient/follow-up state; unique entry/recipient/type |
| `tasks` | A + T | Owner/assigner, title, optional client/visit/entry/concern, due/follow-up dates/times, priority, shared flag, state, notes/actions and resolution timestamp |
| `task_events` | A + T, append-only | Task FK, assignment/status/action change, actor, timestamp, reason and resolution |
| `professional_communications` | A + T | Client/contact FK, GP/district nurse/social worker/other type, direction, subject/details, occurred time, logged-by, follow-up due, response-required/resolved state |
| `concerns` | A + T | Unique reference, client/visit, type, priority, description, raiser, owner, raised/visit dates, state, investigation outcome and closure time |
| `concern_checklist_items`, `concern_notes`, `concern_followers` | A + T each | Concern FK; required action/owner/due/completed time; note/update/evidence; user follower membership |
| `complaints`, `complaint_events` | A + T each | Client/branch, source/theme, received/acknowledged/responded/closed times, target due, owner, outcome and state; append-only status/contact events |
| `compliments`, `feedback_responses` | A + T each | Client/branch/staff links, received time, text, category, consent/publication state; survey/question/version, respondent type, recorded score and response |

The staff dashboard is a permission-filtered projection of these tables plus
assigned visits. Audit Timeline is a scoped ledger projection, not another mutable
activity list. Journal `deleted-for-recipient` hides that recipient's copy; it does
not delete the clinical/professional source record or another user's inbox.

### 6.9 Family sharing

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `family_grants` | A + T | Client FK, recipient verified-user FK/email, relationship, pending/active/revoked state, consent FK, start/expiry/revocation and grant reason |
| `family_grant_scopes` | A + T | Grant FK, care-plan/medication/visits/notes/invoices/messages/documents/photos scope; explicit unique grant/scope |
| `family_updates` | A + T | Client FK, service date, category, draft/published state, author, text, published time and supersedes link |
| `family_messages` | A + T | Grant/client FK, sender, text, sent/read time, thread and attachment links; scope checked on every read/write |
| `family_document_shares` | A + T | Grant/client/file-version FKs, active/effective state, published-by/time; not every client document is family visible |

### 6.10 Finance and billing

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `pay_profiles` | A + T | Staff FK, effective range, hourly/salary basis, rate, contracted hours and pay frequency; no overlapping active effective terms |
| `payroll_settings_versions`, `allowance_definitions` | A + T each | Frequency, overtime multiplier, approval threshold and calculation policy; allowance name/unit/rate/effective dates |
| `work_records`, `work_record_visits` | A + T each | Staff/service date, planned/actual hours, frozen rate, regular/overtime/allowance kind, category/reason, state and approval stage; unique source visit/staff link prevents duplicate transfer |
| `contractors` | A + T | Contractor/agency type, name/contact, default rate/unit, terms, contract dates, reference, manager and document version |
| `supplier_invoices`, `supplier_invoice_lines` | A + T each | Contractor FK, unique supplier/reference, dates/period, state, confirmation/approval metadata and document; description, Decimal source quantity/rate and tax-rate inputs; derive line/tax totals on read |
| `supplier_payments` | A + T, append-only | Invoice FK, amount/currency/date/reference, recorded-by, verified settlement evidence, reversal FK? and unique external transaction key |
| `pay_runs`, `pay_run_lines` | A + T each | Name/period/payday/cutoff/frequency, draft/locked/exported/cancelled workflow state and preparer; settlement/Paid is derived from payment facts; staff/profile/rate-version links, source quantity references and authorised adjustment inputs/reason; derive hours/basic/overtime/allowance/totals on read |
| `pay_run_work_links`, `pay_run_payments` | A + T each | Run line/work FK unique live consumption; append-only recorded payment or external payroll reconciliation with evidence |
| `billing_rate_schedules` | A + T | Client/funder/package FK, effective range, visit-hour/carer-hour basis, rate/currency and approval |
| `client_invoices`, `client_invoice_lines` | A + T each | Client/funder FK, unique number, issued/due/period, draft/approved/exported/void state; visit/attendance source, service date, quantity/basis and approved rate-version input; derive amount on read |
| `client_payments`, `credit_notes` | A + T each | Append-only invoice allocations, date/amount/currency/verified reference; approved credit/reversal linked to original invoice/line |
| `document_sequences` | A + T | Document type/year, next number; lock while allocating company-scoped references |

Calculate line/subtotal/tax/total/balance server-side on each read or validation;
never persist these results. Financial approvals bind immutable source revisions,
rate inputs and formula versions. Recalculate historic invoices/pay runs from their
approved inputs; live draft calculations use current applicable inputs. Current rate
edits create a new effective version rather than rewriting an approved source. Store payment evidence separately from an invoice's approval or
export state. The existing payroll is a gross preparation workflow; do not label
it statutory net payroll, a bank payment or a filing unless an implemented engine
and actual provider outcome support that label.

### 6.11 Quality, compliance and improvement

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `assessment_templates`, `assessment_template_versions` | A + T each | Key/category/subject type, fields/options/required rules, scoring definition, publication state and version |
| `assessments`, `assessment_answers` | A + T each | Template version, staff/client/service subject, assessor, scheduled/review dates, context, draft/scheduled/submitted/signed-off state, conclusion/recommendations; validated field answers |
| `assessment_signatures` | A + T, append-only | Assessment version, signer identity/role, declaration, signed time, content digest and signature purpose |
| `corrective_actions`, `action_events` | A + T each | Assessment/incident/finding link, title, owner, due date, priority, open/in-progress/completed state, resolution/evidence; append-only lifecycle events |
| `quality_frameworks`, `quality_statements` | A, global versioned catalogue each | Framework version, key areas and official statement identifiers/descriptions; no assumed fixed statement count in calculations |
| `company_statement_requirements` | A + T | Framework/statement FK, applicability, required evidence type/count/recency, owner, effective dates, approved weighting/method |
| `quality_evidence`, `evidence_versions` | A + T each | Title/category/owner, source resource/file-version links, draft/in-review/changes-requested/approved/archived state; immutable approved content/version |
| `evidence_statement_links`, `evidence_reviews` | A + T each | Evidence-version/statement through rows; reviewer, outcome, reason and review time; no self-approval where prohibited |
| `policy_documents`, `policy_versions` | A + T each | Policy key/title/owner, effective/review dates, approved document version; explicit links to applicable quality statements/evidence |
| `incidents`, `safeguarding_cases`, `case_events` | A + T each | Client/visit/branch, incident type/severity/time, actions and closure; referral/concern/outcome/owner and dates; append-only case events |
| `environmental_checks`, `check_results` | A + T each | Site/visit/check-template version, due/completed time, assessor; fridge/storage/drug/IPC/fire/other result, value/unit, exception and action FK |
| `quality_statement_scores`, `quality_rating_decisions` | A + T each | Statement/area, branch/period, approved method/version, score inputs, evidence set, reviewer and decision state; distinguish internal rating from external regulator outcome |
| `outstanding_practice_entries` | A + T | Client/staff/branch, category/story, evidence, marks, reviewer/approval, publication/consent state and occurred date |
| `improvement_projects`, `project_milestones` | A + T each | Title/owner/branch, baseline/target/method, start/due dates, state; milestones, weights, completion evidence and review |
| `capa_cases`, `capa_steps`, `capa_effectiveness_reviews` | A + T each | Root issue/source, root-cause analysis, owner/due/state; corrective/preventive steps and completion; dated effectiveness evaluation/outcome |

An incident, concern, complaint and safeguarding case may be linked, but are not
interchangeable counts. Preserve distinct state machines and explicitly define
when a dashboard aggregates them.

### 6.12 Inspections

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `inspections` | A + T | Type, planned/start/end dates, scope, framework version, lead, draft/in-progress/review/final state and summary |
| `inspection_area_reviews` | A + T | Inspection/area FK, notes, provisional internal recommendation, assessed state, evidence links; unique inspection/area |
| `inspection_findings` | A + T | Inspection/statement FK, strength/concern/required-action type, text, owner, due date, state, linked corrective action and evidence |
| `inspection_milestones`, `inspection_reports` | A + T each | Inspection FK, named stage/date/state/completion; report definition revision, source version references and author/reviewer; generate report content on demand without persisting calculated output |

Inspector provider/staff/medication/visit views read the same underlying domain
records. Do not create separate inspector copies of a client's MAR or employee file.

### 6.13 Reports, jobs, integrations and delivery

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `metric_definitions` | A + T or explicit platform catalogue | Stable key, definition version, approved query-handler key, source models, numerator/denominator rules, unit, direction, applicability, thresholds and effective dates |
| `forecast_definitions`, `forecast_runs` | A + T each | Approved model/method, target, source-version references, requested scope/horizon and execution metadata only; compute estimates, uncertainty, validation metrics and availability when requested, never persist output values |
| `saved_reports`, `report_jobs`, `export_jobs` | A + T each | Saved authorised filter/column definitions; requester, requested scope, state, requested/started/completed time, source-version references, expiry and error; no persisted calculated report results/files |
| `import_jobs`, `import_rows`, `legacy_id_mappings` | A + T each | File/schema/source, validate/commit state, errors and counts; source row/validation result; unique source-system/entity/legacy-ID to new UUID mapping |
| `outbox_messages`, `delivery_attempts`, `notification_receipts` | A + T each | Recipient/channel/template/version/payload reference, queued state; provider attempt/outcome/IDs/retry; user in-app delivered/read state |
| `provider_connections`, `api_credentials`, `webhook_events` | A + T each | Provider config and encrypted-secret reference, actual connection status; token prefix/digest/scopes/expiry/revocation; signed provider event ID/payload/received/processed state |
| `idempotency_records` | A + T for tenant commands; A with explicit global context for auth/public commands | Actor/context/route/key unique, body digest, locked processing state, resulting source-resource reference and expiry; replay recalculates response fields rather than storing a calculated response body; enforce global uniqueness separately because nullable tenant keys need explicit constraints |
| `scheduled_jobs`, `job_runs`, `backup_jobs`, `restore_jobs` | A + T or explicit platform operations scope | Schedule/timezone and approved job type; durable run state; backup scope/artifact/checksum and recovery test; approved restore plan/dry-run/execute/reconciliation |
| `audit_events` | A, tenant/global context as section 4 | Append-only resource/access events and redacted change history |

Platform operations jobs must not expose another company's data through tenant job
lists. Each worker reloads tenant permissions and source records before executing.

## 7. Documents and binary data stored in PostgreSQL

| Table | Scope | Domain columns and constraints |
| --- | --- | --- |
| `files` | A + T | Title/category, owner, classification, retention policy, current version, archive state |
| `file_versions` | A + T, immutable after finalisation | File FK, ordinal, original/safe filename, detected MIME, byte count, SHA-256, upload/scan state, scan result/time, finalised time |
| `file_chunks` | A + T, append-only after finalisation | Version FK, chunk index, offset/length, `data bytea`, chunk checksum; unique version/index and validated continuous offsets |
| `upload_sessions` | A + T | Requester, intended owner/purpose, expected size/digest, maximum limits, received bytes, expiry and state |
| `document_links` | A + T | File-version FK and exactly one allowed owning parent FK from the registered domain list: staff, client, application, journal, concern, professional communication, visit, family message, assessment, invoice, evidence, course/lesson, CPD or inspection record; explicit ownership checks and matching tenant |

Uploads use an authenticated session, checked MIME/size, malware scan and an
explicit completion step. Until approved clean, a file is quarantined and cannot
be downloaded by other users, shared with family or counted as approved evidence.
A version is immutable after finalisation; replacement creates a new version.

Serve bytes through authorised API downloads, resolving the owning domain record
and grant again. Support streaming/chunked upload and HTTP range downloads for
Academy media. Never embed base64 document bytes in every list/detail response.
Thumbnails, audio/transcripts and generated PDFs are separate linked versions.
Download URL possession or an unguessable UUID alone is not authorisation.

The database is the baseline binary source. Moving large media to private external
object storage is a later explicit architecture change; it must preserve DB-owned
metadata, versions, access checks and the API contract rather than introducing
public URLs as the new record of truth.

## 8. Endpoint catalogue

All paths in sections 8.2–8.15 are relative to **C**, unless the path explicitly
starts with `/api/v1/`. Expand the resource method sets from section 5 into real
OpenAPI operations; grouped paths below represent separate endpoints. `{id}` always
belongs to the parent and company in the URL. No client-selected actor, tenant,
calculated total, signature, permission or lifecycle state is writable through a
normal PATCH. Read models may aggregate tables; they must still enforce every
underlying record's access rules.

### 8.1 Authentication, personal account and workspace selection

Use Django database sessions with Secure, HttpOnly cookies, CSRF protection on
unsafe requests and a same-origin deployment where possible. Do not store session
credentials in localStorage. Configure cookie lifetime, MFA requirements, inactivity
expiry, rate limits and lockout policy explicitly. An MFA-pending session cannot
access business APIs. SSO uses a verified provider configuration, state, nonce and
PKCE; it resolves identities to database memberships rather than trusting browser
claims. Reset/invite tokens are short-lived, hashed, single-use and never logged.

| Method | Path under `/api/v1` | Contract |
| --- | --- | --- |
| GET | `/auth/csrf` | Establish CSRF protection for the browser session |
| POST | `/auth/login` | Verify password; return authenticated or MFA-required state |
| POST | `/auth/mfa/verify` | Verify challenge and finish sign-in; bounded attempts |
| POST | `/auth/logout` | Revoke current session |
| POST | `/auth/password/forgot` | Generic response; queue real reset delivery |
| POST | `/auth/password/reset` | Consume valid reset token; revoke sessions according to policy |
| POST | `/auth/password/change` | Verify current credentials and change password |
| POST | `/auth/email-verification/request`, `/auth/email-verification/confirm` | Queue verification or consume valid one-time challenge; email changes invalidate old verification |
| POST | `/auth/sso/microsoft/start` | Generate provider redirect and persisted sign-in challenge |
| GET | `/auth/sso/microsoft/callback` | Validate provider response and finish or require MFA |
| GET | `/auth/invitations/{token}` | Minimal safe invitation preview; no unrelated account data |
| POST | `/auth/invitations/{token}/accept` | Verify identity, consume invitation, create membership atomically |
| GET, PATCH | `/me` | Account profile; sensitive changes require reauthentication |
| GET, PATCH | `/me/preferences` | Persist personal UI and notification preferences |
| GET | `/me/workspaces` | Active memberships, allowed company summary and entitlements |
| POST | `/me/workspaces/select` | Validate membership; update server-side active preference |
| GET | `/me/permissions` | Effective permissions for an authorised company context |
| GET | `/me/security` | MFA/session/device summary without secrets |
| GET | `/me/sessions`, `/me/login-events`, `/me/trusted-devices` | Paginated own security records |
| POST | `/me/sessions/{id}/revoke`, `/me/sessions/revoke-others` | Revoke sessions with security audit |
| POST | `/me/trusted-devices/{id}/revoke` | Revoke a trusted-device credential |
| POST | `/me/mfa/enrol`, `/me/mfa/confirm`, `/me/mfa/disable` | Challenge-protected enrolment and removal |
| POST | `/me/mfa/recovery-codes/regenerate` | Replace hashed recovery credentials; reveal clear codes once |

Recovery-code consumption must be atomic and auditable; store separate append-only
consumption events rather than silently replacing a used code with a new one.
Company switching is a convenience, not authority: every C request independently
validates its URL tenant. Do not reveal whether an email has an account in public
password, invitation or login errors.

### 8.2 Companies, locations, access and settings

| Method set | Path | Contract |
| --- | --- | --- |
| RC | `/api/v1/companies` | List accessible companies; creation requires explicit platform permission |
| GET, PATCH | `/api/v1/companies/{company_id}` | Company profile; this is C itself |
| GET | `/api/v1/companies/summary` | Scoped directory totals and filters |
| GET | `/overview` | Company overview, recent activity and derived counts |
| GET, PATCH | `/settings`, `/branding` | Validated singleton settings; branding references stored file versions |
| RCUA | `/contacts`, `/addresses`, `/locations` | Contacts, addresses and service locations |
| GET | `/locations/{id}/overview` | Staff/client/visit counts derived for the location |
| GET, PATCH | `/compliance` | Company compliance settings and readiness projection |
| RCUA | `/compliance/records` | Expiry, evidence and review records |
| R | `/modules/catalogue`, `/addons/catalogue`, `/subscriptions/plans` | DB-backed eligible catalogue entries |
| GET, PATCH | `/modules` | Actual entitlement configuration; permission and subscription checks |
| GET | `/subscription`, `/subscription/limits`, `/subscription/invoices` | Subscription facts, measured usage and billing records |
| POST | `/subscription/change-requests`, `/addons/requests` | Audited requested changes; do not claim provider payment |
| POST | `/addons/requests/{id}/approve`, `/addons/requests/{id}/reject` | Authorised decision and entitlement change when appropriate |
| RCUA | `/memberships`, `/roles` | Membership administration and tenant role definitions |
| R | `/permissions` | DB permission catalogue available to this administrator |
| GET, PATCH | `/memberships/{id}/roles`, `/roles/{id}/permissions` | Validate delegation limits and protect last required administrator |
| POST | `/memberships/{id}/suspend`, `/memberships/{id}/reactivate` | Revoke/reinstate access; invalidate cached grants |
| RC | `/invitations` | Issue scoped invitation and enqueue actual delivery |
| POST | `/invitations/{id}/resend`, `/invitations/{id}/revoke` | Rotate token on resend; record delivery/revocation |
| RCUA | `/workflows`, `/message-templates`, `/document-templates` | Versioned rules and templates |
| RC | `/approval-requests` | Requests linked to a valid domain operation |
| POST | `/approval-requests/{id}/approve`, `/approval-requests/{id}/reject` | Validate approver and current domain version |
| RCUA | `/workspace-drafts` | User-owned drafts for supported forms; explicit schema/version |

Platform-only company administration uses `/api/v1/platform/...` with a separate
permission boundary and audited tenant selection. Never treat all authenticated
users as platform administrators. Subscription usage is calculated from active
records; limits and addon state are not values supplied by the frontend.

### 8.3 Files and document access

| Method | Path | Contract |
| --- | --- | --- |
| POST | `/files/uploads` | Create a bounded upload session with validated purpose/parent |
| PUT | `/files/uploads/{id}/chunks/{index}` | Write one size-limited chunk; digest and retry checks |
| GET | `/files/uploads/{id}` | Own authorised upload progress |
| POST | `/files/uploads/{id}/complete` | Verify total size/digest; queue scan and finalise version |
| POST | `/files/uploads/{id}/cancel` | Cancel upload; clean unused temporary chunks by retention policy |
| GET | `/files`, `/files/{id}`, `/files/{id}/versions` | Metadata only, filtered by owning-record access |
| GET | `/files/{id}/versions/{version_id}/download` | Authorised byte stream, content disposition and range support |
| POST | `/files/{id}/versions` | Start replacement upload; preserve previous version |
| POST | `/files/{id}/archive` | Only when retention and all owning links permit |
| POST | `/document-links` | Link a clean version to an allowed parent with write access |
| POST | `/document-links/{id}/revoke` | Revoke optional share/link; retain historical audit |

The chunk PUT is a specific transport operation, not generic entity replacement.
No endpoint accepts arbitrary file paths, public download URLs or arbitrary model
names as an ownership shortcut.

### 8.4 Recruitment, workforce and HR

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/recruitment/summary`, `/hr/summary`, `/hr/onboarding`, `/hr/compliance` | Counts, queues and expiring items from source records |
| RCUA | `/vacancies` | Vacancy details and application requirements |
| POST | `/vacancies/{id}/publish`, `/vacancies/{id}/close` | Validate fields and set public availability |
| RCU | `/applications` | Authenticated applications and answers; controlled personal data |
| POST | `/applications/{id}/transition` | Allowed recruitment stage with reason/history |
| RCUA | `/applications/{id}/interviews`, `/applications/{id}/offers` | Interviews, decisions and versioned offers |
| POST | `/applications/{id}/hire` | Atomically create/link staff and onboarding; no duplicate hire |
| GET | `/api/v1/public/companies/{company_id}/vacancies/{vacancy_id}` | Only a currently published public vacancy and its form schema |
| POST | `/api/v1/public/companies/{company_id}/vacancies/{vacancy_id}/applications` | Validate required answers, consent and clean upload references; rate limited |
| POST | `/api/v1/public/application-uploads` | Restricted, short-lived application upload flow; no company file browsing |
| RCUA | `/staff` | Directory and staff records; server-side filters and pagination |
| GET | `/staff/{id}/profile`, `/staff/{id}/overview`, `/staff/{id}/compliance-summary` | Aggregated profile projections |
| GET, PATCH | `/staff/{id}/personal`, `/staff/{id}/preferences` | Personal facts and supported preferences |
| RCU | `/staff/{id}/employment-terms` | Effective-dated terms; prevent conflicting intervals |
| RCUA | `/staff/{id}/contacts`, `/staff/{id}/languages` | Explicit audited relationships |
| RCUA | `/staff/{id}/checks`, `/staff/{id}/references`, `/staff/{id}/documents` | Compliance evidence, review and document links |
| POST | `/staff/{id}/checks/{check_id}/verify`, `/staff/{id}/checks/{check_id}/reject` | Record verifier/decision; require permitted reviewer |
| RCUA | `/staff/{id}/availability-rules`, `/staff/{id}/availability-exceptions` | Recurring availability and dated exceptions |
| RCUA | `/induction-templates` | Versioned onboarding definitions |
| GET, PATCH | `/staff/{id}/induction` | Checklist responses; completion checked against required evidence |
| RCUA | `/staff/{id}/training-records`, `/staff/{id}/training-bookings` | External training and bookings linked to course/competency where relevant |
| RCUA | `/staff/{id}/notes`, `/staff/{id}/actions`, `/staff/{id}/requests` | Permission-filtered HR records and queues |
| RCU | `/leave-requests` | Request leave; balances calculated from entitlement and approved usage |
| POST | `/leave-requests/{id}/submit`, `/leave-requests/{id}/approve`, `/leave-requests/{id}/reject`, `/leave-requests/{id}/cancel` | Transition, reason and availability impact |
| RCUA | `/leave-entitlement-rules` | Effective-dated entitlement configuration |
| RCU | `/staff-reviews`, `/competency-assessments` | Supervisions, spot checks, reviews and observed competency |
| POST | `/staff-reviews/{id}/complete`, `/competency-assessments/{id}/sign-off` | Validate required observations/signature and lock content |
| RCUA | `/staff/{id}/performance-goals`, `/staff/{id}/recognition` | Measurable goals and recognition linked to evidence |
| GET | `/staff/{id}/training`, `/staff/{id}/reviews`, `/staff/{id}/performance` | Shared-source profile views, not duplicate records |

Public submissions cannot set internal stage, score, approval or staff identity.
Document upload tokens must bind the intended vacancy/application and expire.
Self-service staff updates are field-limited and may create approval requests when
policy requires; general HR permissions are not granted to every staff member.

### 8.5 Academy, learning and CPD

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/academy/summary`, `/academy/catalogue`, `/academy/reports`, `/academy/progress` | Database-derived admin/learner views with separate permissions |
| RCUA | `/academy/courses`, `/academy/lessons`, `/academy/questions`, `/academy/question-tags` | Editable drafts and metadata |
| POST | `/academy/courses/{id}/publish`, `/academy/lessons/{id}/publish`, `/academy/questions/{id}/publish` | Create immutable version; validate dependencies |
| POST | `/academy/courses/{id}/new-version` | Copy published version into a new editable draft |
| GET | `/academy/courses/{id}/versions`, `/academy/lessons/{id}/versions`, `/academy/questions/{id}/versions` | Authorised version history; hide answer keys from learners |
| GET, PATCH | `/academy/settings` | Versioned pass, attempt, timing and certificate policy |
| RCU | `/academy/assignments` | Assign exact course version to eligible staff |
| POST | `/academy/assignments/bulk-assign` | Validate whole selection; return per-row outcomes if explicitly non-atomic |
| GET | `/academy/me/dashboard`, `/academy/me/assignments`, `/academy/me/progress`, `/academy/me/certificates` | Current learner only |
| GET | `/academy/me/assignments/{id}` | Safe course/lesson content and allowed next actions |
| POST | `/academy/me/assignments/{id}/lessons/{lesson_id}/progress` | Save validated progress; completion rules are server-enforced |
| POST | `/academy/me/assignments/{id}/attempts` | Freeze question set/order/version and start server-timed attempt |
| GET | `/academy/me/attempts/{id}` | Safe question projection; no scoring keys |
| PATCH | `/academy/me/attempts/{id}/answers/{question_id}` | Save an answer while attempt remains open |
| POST | `/academy/me/attempts/{id}/submit` | Atomic, idempotent server grading and result calculation |
| GET | `/academy/me/attempts/{id}/result` | Policy-filtered result/review after submission |
| GET | `/academy/certificates/{id}`, `/academy/certificates/{id}/download` | Certificate issuance source record and authorised on-demand rendering/stream; no stored calculated file |
| RCU | `/academy/cpd-records` | CPD details and evidence; staff-scoped self-service |
| POST | `/academy/cpd-records/{id}/submit`, `/academy/cpd-records/{id}/approve`, `/academy/cpd-records/{id}/return` | Review workflow; reasons on return |
| GET | `/academy/reports/compliance`, `/academy/reports/course-results`, `/academy/reports/cpd` | Filtered report data with denominators and as-of time |

A browser timer, percentage, attendance claim or pass flag cannot grant completion.
Retakes follow the stored assignment/version policy. Reissuing a certificate must
retain its original evidence and any revocation history.

### 8.6 Service users, care records and clinical outcomes

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/clients/summary` | Directory statistics over accessible service users |
| RCUA | `/clients` | Service-user demographic and service records |
| GET | `/clients/{id}/profile`, `/clients/{id}/overview`, `/clients/{id}/timeline` | Aggregated care profile and chronological source events |
| GET | `/client-section-definitions` | DB field catalogue, schema versions and allowed sections |
| GET, PATCH | `/clients/{id}/sections/{section_key}` | Validated section data/revision with ETag; normalised records remain authoritative |
| GET | `/clients/{id}/sections/{section_key}/revisions` | Permission-filtered previous section revisions |
| RCUA | `/clients/{id}/contacts`, `/clients/{id}/staff-assignments`, `/clients/{id}/documents` | Contacts, assigned staff and linked file versions |
| RCUA | `/clients/{id}/diagnoses`, `/clients/{id}/allergies`, `/clients/{id}/communication-needs` | Structured clinical/personal facts |
| RCU | `/clients/{id}/care-plans` | Plan draft and version history |
| POST | `/clients/{id}/care-plans/{plan_id}/publish`, `/clients/{id}/care-plans/{plan_id}/new-version` | Validate sign-off; immutable published plan |
| RCU | `/clients/{id}/goals`, `/clients/{id}/goal-measurements` | Goals, baselines, target dates and observed outcome measurements |
| RCU | `/clients/{id}/risk-assessments`, `/clients/{id}/risk-reviews` | Scored using stored assessment policy, not browser scores |
| RCU | `/clients/{id}/moving-handling-plans`, `/clients/{id}/capacity-assessments`, `/clients/{id}/legal-authorities`, `/clients/{id}/consents` | Versioned care/legal records with effective/expiry dates |
| POST | `/clients/{id}/consents/{consent_id}/withdraw` | Effective withdrawal, access/share consequences and audit |
| GET, PATCH | `/clients/{id}/access-instructions`, `/clients/{id}/support-preferences` | Particularly restricted personal/access details |
| RCUA | `/clients/{id}/care-tasks` | Planned care tasks |
| RC | `/clients/{id}/task-completions`, `/clients/{id}/observations` | Attributed actual events with measurement units |
| POST | `/clients/{id}/observations/{observation_id}/correct` | Preserve original and link correction |
| RCU | `/clients/{id}/clinical-reviews`, `/clients/{id}/referrals`, `/clients/{id}/hospital-events` | Actual review/referral/admission facts and supported avoidance evidence |
| RCUA | `/wellbeing-activities` | Available activity definitions |
| RC | `/clients/{id}/activity-participation` | Actual attendance, preference and outcome observations |
| GET | `/clients/{id}/visits`, `/clients/{id}/journal`, `/clients/{id}/professional-communications` | Scoped projections of shared domains |

The section endpoint must map fields to their owning tables in one service-layer
transaction. It cannot create a second medication list or untracked copy of the
care plan inside JSON. Access instructions, capacity information and family contact
data need field-level disclosure rules in addition to ordinary client access.

### 8.7 Prescriptions, MAR and stock

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/medication/summary`, `/clients/{id}/medication/summary` | Actual scheduled, administered, overdue and stock projections |
| RCU | `/clients/{id}/prescriptions` | Prescription draft/details and effective versions |
| POST | `/clients/{id}/prescriptions/{prescription_id}/activate`, `/clients/{id}/prescriptions/{prescription_id}/discontinue`, `/clients/{id}/prescriptions/{prescription_id}/new-version` | Authorised clinical transitions with reason/effective time |
| GET | `/clients/{id}/prescriptions/{prescription_id}/versions` | Immutable prescribing history |
| RCU | `/clients/{id}/prescriptions/{prescription_id}/schedules` | Versioned schedule rules; changes cannot rewrite past occurrences |
| GET, PATCH | `/clients/{id}/prescriptions/{prescription_id}/prn-protocol` | Versioned singleton PRN rule; mutation creates a new effective version |
| GET | `/clients/{id}/dose-occurrences`, `/clients/{id}/mar`, `/clients/{id}/administrations` | Period/visit filtered expected doses and append-only outcomes |
| POST | `/clients/{id}/administrations` | Record Given/Refused/Omitted/Absent and required reason, dose, witness |
| POST | `/clients/{id}/administrations/{administration_id}/correct` | Link correction, preserve original, reconcile stock within transaction |
| GET | `/clients/{id}/prescriptions/{prescription_id}/stock`, `/clients/{id}/prescriptions/{prescription_id}/stock-movements` | Balance derived from ledger, never a client-edited total |
| POST | `/clients/{id}/prescriptions/{prescription_id}/stock-movements` | Receipt, disposal or authorised adjustment with units and reason |
| RCU | `/clients/{id}/medication-reviews` | Medication reconciliation, PRN effectiveness and high-risk reviews |
| POST | `/clients/{id}/medication-reviews/{review_id}/sign-off` | Validate evidence and lock reviewed version |
| GET | `/medication/reports/mar-compliance`, `/medication/reports/stock-alerts`, `/medication/reports/errors` | Derived reports linked to drill-down records |

Validate effective prescription, support level, route, scheduled occurrence, PRN
interval/24-hour maximum, units, actor competence, witness requirement and stock
policy on the server. Corrections and retries cannot consume stock twice. A late
record needs actual event time, recording time and reason; never backdate audit time.
Medication errors link to incidents; missed-dose metrics distinguish unresolved
missing records from documented refusal or clinically authorised omission.

### 8.8 Visits, rota, attendance and live ECM

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/scheduling/summary`, `/scheduling/planner`, `/scheduling/calendar` | Period/location/staff/client views from the same visits |
| RCUA | `/call-packages` | Recurrence, staffing/skills, travel and service requirements |
| POST | `/call-packages/{id}/new-version` | Preserve effective recurrence/rate context |
| POST | `/visits/generate`, `/visits/copy-period` | Idempotent generation/preview with explicit period and source version |
| RCU | `/visits` | Visit facts; PATCH limited to editable draft fields |
| POST | `/visits/{id}/cancel`, `/visits/{id}/reschedule` | Reason and safe impact on allocations/notifications/billing |
| GET | `/visits/{id}/history`, `/visits/{id}/eligible-staff` | Changes and rule-checked candidates |
| POST | `/allocations/suggest`, `/allocations/validate` | Read-only calculation over current facts; explain constraints, no silent assignment |
| POST | `/allocations/bulk-assign`, `/allocations/bulk-unassign` | Atomic by default; validate all rows and lock conflicting reservations |
| POST | `/visits/{id}/allocations` | Assign one eligible staff member to a staffing slot |
| POST | `/visits/{id}/allocations/{allocation_id}/remove` | Controlled unassignment with impact/reason |
| POST | `/allocation-overrides` | Explicit permitted override with failed-rule evidence and approver |
| RC | `/rota-publications` | Record published assignment source versions and publication event |
| POST | `/rota-publications/{id}/notify` | Durable notifications for actual publication; deduplicated delivery |
| GET | `/attendance`, `/attendance/summary`, `/visits/{id}/attendance` | Actual attendance events and derived durations |
| POST | `/visits/{id}/check-in`, `/visits/{id}/check-out` | Attributed, time-validated append-only attendance events |
| POST | `/attendance/{id}/correct` | Manager-authorised correction with original preserved |
| GET | `/ecm/live`, `/ecm/summary`, `/ecm/alerts` | Server-time punctuality/status and follow-up projections |
| GET | `/ecm/events` | Authorised SSE stream; scoped cursor and reconnect support |
| RC | `/visits/{id}/ecm-actions` | Contact, delay, request-change, review, escalation and manager-note events |
| RCU | `/ecm/escalations` | Escalation ownership and permitted editable fields |
| POST | `/ecm/escalations/{id}/transition` | Open/in-review/resolved workflow with reason/evidence |
| RC | `/visits/{id}/evidence` | Stored photo/audio/document/transcript references |
| RCU | `/visits/{id}/reviews` | Delivery review linked to attendance and tasks |
| RCUA | `/visit-preferences`, `/service-change-requests`, `/emergency-cover-requests` | Client preferences and response/coverage workflow |
| POST | `/service-change-requests/{id}/transition`, `/emergency-cover-requests/{id}/transition` | Track acknowledgment, cover assignment and actual resolution times |
| RCUA | `/call-styles` | Persisted display classifications and permitted labels |
| GET, PATCH | `/ecm/policy` | Versioned lateness, missing-call, grace period and escalation rules |

A missed/late flag is calculated using server time, planned time, actual attendance
and effective policy. Multi-carer calls keep individual attendance and an explicit
visit-completion policy. No call is completed by publishing a rota. Geolocation, if
used, stores permission/provenance and accuracy; location absence is not fabricated.
The event stream rechecks access and stops on session/membership revocation.

### 8.9 Journal, tasks, concerns and staff portal

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/staff-portal/dashboard`, `/staff-portal/summary` | Current staff member's tasks, visits, journal, alerts and counts |
| GET | `/staff-portal/service-users`, `/staff-portal/allocations` | Assigned/otherwise permitted records only |
| GET | `/staff-portal/manager-oversight` | Explicit manager permission; branch/team-scoped projection |
| GET | `/journal/folders`, `/journal/summary` | Own recipient folder/unread counts |
| RCU | `/journal/entries` | Draft creation and editing; recipients and allowed attachments |
| POST | `/journal/entries/{id}/send` | Validate recipients/access, lock sent content, create recipient rows/outbox |
| POST | `/journal/entries/{id}/reply`, `/journal/entries/{id}/forward` | New linked entry; cannot bypass source disclosure rules |
| GET | `/journal/threads/{id}` | Only visible messages in the thread |
| PATCH | `/journal/entries/{id}/recipient-state` | Own read/star/archive/trash/follow-up state |
| GET | `/journal/recipients` | Eligible scoped recipient lookup; no cross-company directory |
| RCU | `/tasks` | Assigned tasks linked to a supported source |
| POST | `/tasks/{id}/transition`, `/tasks/{id}/assign` | Valid transitions/assignees, resolution requirements and history |
| GET | `/tasks/{id}/events` | Task history |
| RCU | `/professional-communications` | GP/nurse/social-worker communications and actual direction/channel |
| POST | `/professional-communications/{id}/send` | Only for configured delivery channel; queued is not delivered |
| RCU | `/concerns` | Concern records and permitted editable fields |
| POST | `/concerns/{id}/transition`, `/concerns/{id}/assign` | Raised through Closed, with required investigation/outcome evidence |
| RC | `/concerns/{id}/notes` | Attributed follow-up notes and evidence |
| GET, PATCH | `/concerns/{id}/checklist` | Versioned checklist state and completion evidence |
| POST | `/concerns/{id}/follow`, `/concerns/{id}/unfollow` | Own audited following relationship |
| GET | `/staff-portal/audit` | Permission-scoped own/team events; never unrestricted tenant audit |

Journal Sent is a persisted internal message state; external email/SMS delivery has
separate provider receipts. Trash is recipient state, not deletion of another
recipient's copy or the source care record. Concerns, incidents and safeguarding
can link to one another without duplicating their lifecycles.

### 8.10 Family portal

| Method set | Path | Contract |
| --- | --- | --- |
| RCU | `/clients/{id}/family-grants` | Staff administration of verified family identity and permitted scopes |
| POST | `/clients/{id}/family-grants/{grant_id}/activate`, `/clients/{id}/family-grants/{grant_id}/revoke` | Verify consent/legal basis and change access immediately |
| RCU | `/clients/{id}/family-updates` | Draft/approved family-safe updates, explicit category and share scope |
| POST | `/clients/{id}/family-updates/{update_id}/publish` | Check linked content, consent and intended grant audience |
| RCU | `/clients/{id}/family-document-shares` | Explicit approved file-version sharing |
| GET | `/api/v1/family/context` | Only the signed-in identity's active grants and safe client summaries |
| GET | `/api/v1/family/grants/{grant_id}/dashboard` | Scoped updates and accessible sections |
| GET | `/api/v1/family/grants/{grant_id}/care-plan`, `/api/v1/family/grants/{grant_id}/medication`, `/api/v1/family/grants/{grant_id}/visits` | Redacted domain projections requiring each scope |
| GET | `/api/v1/family/grants/{grant_id}/notes`, `/api/v1/family/grants/{grant_id}/invoices`, `/api/v1/family/grants/{grant_id}/documents`, `/api/v1/family/grants/{grant_id}/photos` | Separate scope checks; private internal notes excluded |
| RC | `/api/v1/family/grants/{grant_id}/messages` | Family-safe conversation with permitted care team |
| GET | `/api/v1/family/grants/{grant_id}/documents/{share_id}/download` | Revalidate active grant, consent, scope and exact shared version |

An email query parameter, client UUID or client contact row alone grants no access.
Revocation affects lists, downloads, messages, exports and active streams. Do not
expose staff HR, full internal journal threads or unshared invoice/document data.

### 8.11 Finance, payroll preparation and billing

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/finance/summary`, `/payroll/summary` | Totals derived from source work, runs, invoices and payment ledger |
| GET, PATCH | `/payroll/settings` | Versioned period, rounding, allowance and export policy |
| RCU | `/staff/{id}/pay-profiles` | Effective rates/salary and pay frequency; prevent overlapping effective terms |
| RCUA | `/payroll/allowances`, `/billing/rates`, `/contractors` | Rate/allowance definitions and supplier records |
| RCU | `/work-records` | Requested work and permitted editable facts; link actual source visits |
| POST | `/work-records/{id}/transition` | Requested/Authorised/Confirmed/Approved/Returned/Rejected with role checks |
| POST | `/work-records/from-visits` | Idempotently create eligible work from verified attendance |
| GET | `/work-records/summary`, `/work-records/{id}/history` | Reconciled queues and transition history |
| RCU | `/supplier-invoices` | Invoice header/lines; validate supplier reference and linked work |
| POST | `/supplier-invoices/{id}/transition` | Recorded/Work confirmed/Approved/Returned/Rejected/Cancelled |
| RC | `/supplier-invoices/{id}/payments` | Record actual payment evidence, date and reference; allow partial payments |
| POST | `/supplier-invoices/{id}/payments/{payment_id}/reverse` | Append reversal; never edit a posted payment |
| RCU | `/pay-runs` | Draft period/scope and allowed adjustments |
| POST | `/pay-runs/{id}/calculate` | Read-only preview from approved eligible work and effective profiles; no stored totals or source consumption until lock |
| GET | `/pay-runs/{id}/lines`, `/pay-runs/{id}/reconciliation` | Frozen source/rate detail and explainable totals |
| POST | `/pay-runs/{id}/lock`, `/pay-runs/{id}/cancel` | Validate current sources and lock; cancellation policy preserves history |
| POST | `/pay-runs/{id}/exports` | Generate real file from locked run; return durable job |
| RC | `/pay-runs/{id}/payments` | Verified payment recording; derive Paid only when eligible balance is settled |
| POST | `/pay-runs/{id}/payments/{payment_id}/reverse` | Audited reversal and recalculated settlement state |
| RCU | `/client-invoices` | Draft invoice and authorised editable lines |
| POST | `/client-invoices/from-visits` | Idempotent billing from eligible delivered visits and effective rate basis |
| POST | `/client-invoices/{id}/approve` | Bind number, immutable line/rate/source inputs and formula version; calculate/validate totals without storing them |
| POST | `/client-invoices/{id}/exports` | Register export request/source scope; download calculates and streams output without storing it; export does not imply payment |
| RC | `/client-invoices/{id}/payments`, `/client-invoices/{id}/credit-notes` | Actual receipts/credits with remaining balance checks |
| POST | `/client-invoices/{id}/payments/{payment_id}/reverse` | Append-only financial correction |
| GET | `/finance/reports/work`, `/finance/reports/payroll`, `/finance/reports/receivables`, `/finance/reports/payables` | Explainable filtered reconciliations |

Visit-hour and carer-hour billing are distinct stored rate bases. A two-carer,
one-hour visit is one visit hour or two carer hours according to its approved
rate. Prevent the same work/billing source from being consumed twice across runs
or invoices, including concurrent requests. Preserve cancelled/reversed links for
audit while explicitly allowing a valid replacement under policy.

The current UI prepares gross payroll. Do not invent statutory tax, pension,
National Insurance, net pay, bank execution or HMRC filing. Any later statutory
payroll/provider integration needs its own verified contract and reconciliation.
Recording a payment is an audited claim supported by reference/evidence; sending
an export or pressing an approval button is not proof that money moved.

### 8.12 Quality assessments, evidence, risks and improvement

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/quality/summary`, `/quality/assessment-catalogue`, `/quality/supervisor-overview` | Real queue totals, available versioned templates and assigned/team supervisor review queues |
| RCUA | `/quality/templates` | Care/quality/people assessment templates and field schema |
| POST | `/quality/templates/{id}/publish`, `/quality/templates/{id}/new-version` | Immutable published schema and new editable draft |
| RCU | `/quality/assessments` | Staff/client/service subject; draft responses and scheduled dates |
| POST | `/quality/assessments/{id}/schedule`, `/quality/assessments/{id}/submit`, `/quality/assessments/{id}/sign-off`, `/quality/assessments/{id}/reopen` | Validated state machine; signature binds content version; reopening requires reason |
| GET | `/quality/assessments/{id}/revisions`, `/quality/assessments/{id}/signatures` | Historical answers and sign-offs |
| RCU | `/quality/actions` | Corrective action, responsible owner, due date and source |
| POST | `/quality/actions/{id}/transition` | Completion requires resolution/evidence; retain events |
| R | `/quality/frameworks`, `/quality/frameworks/{id}/statements` | DB catalogue with exact framework/version applicability |
| RCU | `/quality/requirements` | Company applicability, evidence requirements and effective dates |
| RCU | `/quality/evidence` | Evidence metadata and immutable file/content versions |
| POST | `/quality/evidence/{id}/submit`, `/quality/evidence/{id}/approve`, `/quality/evidence/{id}/request-changes`, `/quality/evidence/{id}/archive` | Reviewer decision and version-specific history |
| RC | `/quality/evidence/{id}/links` | Same-tenant links to statements, source events, policies or inspections |
| POST | `/quality/evidence/{id}/links/{link_id}/revoke` | Historical unlink with reason |
| GET | `/quality/evidence/gaps`, `/quality/evidence/approval-workflow`, `/quality/evidence/by-key-area` | Calculations from required/approved/current evidence |
| RCU | `/policies` | Versioned policy documents, review dates and evidence links |
| POST | `/policies/{id}/publish`, `/policies/{id}/new-version` | Immutable approved version and subsequent draft |
| RCU | `/incidents`, `/safeguarding-cases`, `/complaints` | Separate domain records and safe editable facts |
| POST | `/incidents/{id}/transition`, `/safeguarding-cases/{id}/transition`, `/complaints/{id}/transition` | Investigation/response/resolution with actual times and evidence |
| RC | `/incidents/{id}/events`, `/safeguarding-cases/{id}/events`, `/complaints/{id}/events` | Attributed investigation and response events |
| RCU | `/environmental-checks` | Planned check, actual results and linked actions |
| POST | `/environmental-checks/{id}/complete` | Validate all applicable check items |
| RCU | `/quality/statement-scores`, `/quality/rating-decisions` | Explicit assessment decisions with evidence, policy and approver |
| POST | `/quality/rating-decisions/{id}/approve` | Lock internal rating decision; never label it an official regulator rating |
| RCUA | `/compliments`, `/feedback-responses`, `/quality/outstanding-practice` | Genuine feedback, satisfaction answers and reviewed practice evidence |
| RCU | `/quality/improvement-projects`, `/quality/capa-cases` | Owner, scope, milestones, source issue and effectiveness criteria |
| RCU | `/quality/improvement-projects/{id}/milestones`, `/quality/capa-cases/{id}/steps` | Planned/actual progress with evidence |
| POST | `/quality/improvement-projects/{id}/transition`, `/quality/capa-cases/{id}/transition` | Closure requires required actions and effectiveness review |
| RC | `/quality/capa-cases/{id}/effectiveness-reviews` | Observed follow-up results; prevent unsupported closed-success claims |

### 8.13 All nine Rich KPI dashboards

Use `GET C/quality/dashboards/{slug}` for the initial complete dashboard and
`GET C/quality/dashboards/{slug}/panels/{panel_key}` for independently refreshed
panels. `GET C/quality/dashboards/{slug}/drilldowns/{metric_key}` returns the
permission-filtered source records behind a metric. Supported panel and metric
keys are registered/versioned; reject unknown keys rather than evaluating arbitrary
query expressions from a URL.

| Slug | Existing page heading | Required source/panel coverage |
| --- | --- | --- |
| `executive` | Executive KPI Command Centre | Overall quality/readiness, five areas, management actions, trends, personal outcomes, branch risk heatmap, extra-mile evidence, alerts and family feedback |
| `cqc-scorecard` | CQC Five Key Questions Scorecard | Framework statements/coverage, five-area comparison, statement evidence, mock findings, priority gaps and recent uploads |
| `safe-care` | Safe Care & Risk Intelligence | Risk register, MAR, falls/incidents, safeguarding, high-risk client heatmap, branch safety, environmental/storage checks, personal safety and actions |
| `effective-care` | Effective Care Outcomes & Clinical Quality | Outcome groups/domains, goals/trends, avoidance evidence, delegated-task competence, clinical monitoring, case studies, measured improvements and consent |
| `caring-experience` | Caring & Person-Centred Experience | Branch care matrix, satisfaction trends, testimonials, extra-mile moments, personal outcomes, accessibility, evidence bank, insights and actions |
| `responsive-service` | Responsive Service Delivery & Complaints Resolution | Delivery trends, live punctuality, late/missed heatmap, complaints, response times, reviews, emergency cover, preferences and service recovery |
| `inspection-readiness` | Inspection Readiness & Evidence Library | Readiness, library, key-area evidence, gaps, approval workflow, mock timeline, practice gallery and inspector-view checks |
| `workforce-quality` | Workforce Quality, Training & Competency | Training/competence matrix, staffing heatmap, supervision/spot checks, recruitment funnel, expiries, workforce trends, staff comparison and recognition |
| `predictive-insights` | Predictive Insights & Continuous Improvement | Versioned forecasts, branch risk, predictive alerts, projects, CAPA, repeated themes, recommended actions and highest-risk intervention queue |

The existing Quality & Compliance landing route maps to `executive`. Backend slugs
are stable regardless of frontend navigation labels. There is no separate store of
sample dashboard data per page.

Common query parameters: `period_start`, `period_end`, `as_of`, `location_id`,
`staff_id`, `client_group`, `comparison`, `timezone` and `granularity`, restricted to
supported values. `timezone` must be allowed for the company; it does not change
persisted timestamps. Return applied filters, interval boundaries, calculation time,
source watermark, metric-definition version and completeness. A current live panel
may have a newer `as_of` than a historical period chart; identify this explicitly.

Example metric response shape (illustrative numbers, never production seeds):

```json
{
  "key": "care_plan_reviews_on_time",
  "value": "92.00",
  "unit": "percent",
  "numerator": 46,
  "denominator": 50,
  "period_start": "2026-09-01",
  "period_end": "2026-10-01",
  "as_of": "2026-10-01T00:00:00Z",
  "definition_version": 3,
  "comparison": {"value": "89.00", "delta": "3.00", "unit": "percentage_points"},
  "completeness": {"state": "complete", "missing_records": 0},
  "source_watermark": "2026-10-01T00:00:00Z",
  "unavailable_reason": null
}
```

| Method set | Path | Contract |
| --- | --- | --- |
| R | `/reporting/metric-definitions` | Versioned definition, owner, unit, inputs, denominator, comparison and direction |
| POST | `/reporting/metric-definitions/{id}/versions` | Privileged new validated definition; no arbitrary SQL supplied by clients |
| POST | `/reporting/metric-definitions/{id}/activate` | Approve effective scoring/configuration version |
| R | `/reporting/forecast-definitions`, `/reporting/forecast-runs` | Definitions and execution/source metadata only; no stored result snapshots |
| POST | `/reporting/forecast-runs` | Execute approved model over current scoped source records; return calculated results without persisting them, plus execution/source metadata |
| GET | `/reporting/forecast-runs/{id}/values` | Recalculate from current authorised facts using the run definition/scope; return current horizon, uncertainty and source lineage, not a stored prior result |

### 8.14 Inspector portal

All paths below remain inside C. Inspection-specific write permissions must be
separate from source-domain clinical/HR/finance permissions.

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/inspector/dashboard` | Inspection/readiness summary over accessible source records |
| GET | `/inspector/provider`, `/inspector/service-users`, `/inspector/staffing`, `/inspector/medication`, `/inspector/incidents`, `/inspector/quality`, `/inspector/documents`, `/inspector/visits` | Eight scoped source projections for the existing destinations |
| GET | `/inspector/reports`, `/inspector/notes` | Accessible generated reports and inspection notes |
| RCU | `/inspections` | Mock/internal inspection scope, schedule and draft assessment |
| RCU | `/inspections/{id}/area-reviews`, `/inspections/{id}/findings`, `/inspections/{id}/milestones`, `/inspections/{id}/notes` | Inspection-owned observations and timeline |
| POST | `/inspections/{id}/complete`, `/inspections/{id}/reopen` | Validate findings/sign-off; preserve previous report version |
| RC | `/inspections/{id}/reports`, `/inspections/{id}/evidence-packs` | Generate durable report/package from scoped source versions |
| GET | `/inspections/{id}/reports/{report_id}/download`, `/inspections/{id}/evidence-packs/{pack_id}/download` | Recheck current access; on-demand rendering and exact source-version provenance |

Use the document service for all downloads. An evidence pack needs an explicit
manifest of included record IDs/versions and exclusions; it must not bundle the
whole tenant database. Internal inspection findings and provisional ratings must
be labelled as such in the API and generated reports.

### 8.15 Shared audit, reporting, notifications and integrations

| Method set | Path | Contract |
| --- | --- | --- |
| GET | `/search` | Unified search across allowed domains only; field disclosure and result counts scoped |
| GET | `/audit-events`, `/audit-events/{id}` | Authorised immutable audit history; filter by actor/resource/date/action |
| GET | `/notifications`, `/notifications/summary` | Current recipient's persisted in-app notifications and unread count |
| POST | `/notifications/{id}/read`, `/notifications/read-all` | Own recipient state only |
| GET | `/notification-deliveries`, `/notification-deliveries/{id}` | Provider/delivery history restricted to permitted operational users |
| POST | `/notification-deliveries/{id}/retry` | Retry eligible failure idempotently; preserve previous attempt |
| RCUA | `/reports/saved` | Versioned permitted report parameters, not arbitrary database queries |
| POST | `/reports/jobs`, `/exports` | Queue a registered report/export with validated filters and authorised scope/version references |
| GET | `/reports/jobs`, `/reports/jobs/{id}`, `/exports`, `/exports/{id}` | Durable job status, execution metadata and errors; derive business row counts on read |
| GET | `/reports/jobs/{id}/download`, `/exports/{id}/download` | Fresh access check, audit and on-demand calculated stream from authorised source records |
| RCUA | `/integrations` | Provider configuration metadata; secret inputs write-only/encrypted |
| POST | `/integrations/{id}/test`, `/integrations/{id}/sync` | Actual connection test/synchronisation jobs; unavailable if unconfigured |
| RC | `/api-credentials` | One-time secret issuance with explicit scopes and expiry |
| POST | `/api-credentials/{id}/revoke`, `/api-credentials/{id}/rotate` | Immediate revocation; audit and safe rotation |
| POST | `/api/v1/webhooks/{provider}/{connection_id}` | Verify signature, resolve tenant from connection, deduplicate and persist receipt |
| POST | `/imports` | Restricted upload/schema selection and dry-run job by default |
| GET | `/imports`, `/imports/{id}`, `/imports/{id}/rows` | Validation, mapping and per-row failures |
| POST | `/imports/{id}/commit`, `/imports/{id}/cancel` | Commit reviewed valid mapping idempotently; retain lineage |
| GET | `/jobs/{id}` | Caller-authorised durable job result; no foreign job probing |
| GET, PATCH | `/backup-preferences` | Scheduling/retention preferences; does not claim backups ran |
| POST | `/backup-jobs` | Privileged real backup request, constrained to allowed tenant/system mode |
| GET | `/backup-jobs`, `/backup-jobs/{id}` | Verified artifact/checksum/restore-test state |
| POST | `/restore-jobs` | Restricted staged restore workflow; never arbitrary SQL upload into production |
| GET | `/restore-jobs/{id}` | Validation/reconciliation/execution outcome |
| GET | `/api/v1/schema` | Generated versioned OpenAPI for actual implemented operations |
| GET | `/api/v1/health/live`, `/api/v1/health/ready` | Minimal process/DB/migration readiness; no secrets or business records |

Add the following physical audited records to section 6's supporting schema when
implementing these operations: `recovery_code_consumptions` (A, user/code/event,
append-only); `notifications` and `notification_recipient_states` (A + T, source,
recipient, template/version, content reference, read time); `inspection_notes`
(A + T, inspection, author, visibility, content/version); `subscription_change_requests`
(A + T, requested plan, requester, approver, effective date, decision); and
`integration_sync_runs` (A + T, connection, job, source cursor, counts and outcome).
They are real tables, not transient frontend arrays. Catalogue tag/option/checklist
and attachment relationships likewise require explicit A/T association models.

## 9. Calculation contract for cards, charts and tables

### 9.1 Shared calculation rules

Each metric definition must specify its stable key, source tables, eligible
population, period boundaries, exclusions, numerator, denominator, unit, rounding,
aggregation, freshness, completeness, comparison and favourable direction. Bind
implemented query handlers and frontend calculation functions to approved definition
versions, recording which layer executes each calculation. Do not execute arbitrary
SQL, Python or expressions submitted through metric configuration.

Use half-open intervals `[start, end)` consistently. Convert company-local service
dates/period boundaries to UTC for event queries, including British daylight-saving
changes. Use actual event dates for activity and explicit `as_of` cutoffs for stocks
such as open cases. Persist enough state history to reconstruct historical cutoffs;
current status alone cannot produce a truthful historical trend. Reconstruct
history from source events/revisions; do not persist daily/monthly calculated
snapshots. A query uses a consistent database read boundary and returns `as_of`;
new requests must include committed changes rather than reuse a stale aggregate.

Ratios aggregate by summing numerators/denominators, not averaging branch percentages.
Count distinct source IDs when evidence links or staffing slots would otherwise
multiply rows. A missing period produces `null`/incomplete, not a straight-line
interpolation. Never pad charts with fabricated prior months. Ratios, raw counts,
rates per 1,000 visits and monetary amounts remain separate typed values.

Percentage-point change is `current_percent - previous_percent`; relative change is
`100 × (current - previous) / previous`. Label which is being returned. Relative
change from zero is unavailable. Use comparable period length and population and
report exclusions. An upward arrow is not automatically good: risk, sickness,
errors and overdue items generally have the opposite favourable direction.

### 9.1.1 Calculation placement: frontend, backend or database

Use the frontend for inexpensive, presentation-only derivations from data already
fetched with permission. This reduces repeated API requests and server work without
moving ownership of records, security or business decisions into the browser.
PostgreSQL remains the source of truth for all business facts and configuration;
a frontend-derived display value does not need its own stored database column.

| Run in | Suitable calculations | Boundary |
| --- | --- | --- |
| Frontend | Formatting dates/currency, chart scales and labels, progress-bar widths, percentage or percentage-point display from supplied numerator/denominator, comparison arrows, subtotals of explicitly selected/visible rows and editable-form previews | Use authorised fetched inputs and documented formula versions; clearly label partial/page/selection totals and previews. Never commit these values as trusted facts. |
| Django backend | Authoritative invoice/payroll amounts, medication/PRN/stock validation, compliance eligibility and scoring policies, scheduling conflicts, approval rules, permission-dependent calculations, official application reports and committed workflow results | Reload current scoped DB records and independently calculate/validate inside the appropriate transaction. A frontend preview cannot authorise a change. |
| PostgreSQL query or backend reporting job | Full-dataset counts, sums, grouped periods, cross-record joins, deduplication, historical event queries and large dashboard/report aggregates | Apply tenant/record permissions before aggregation. Return compact aggregates rather than downloading an entire dataset for browser processing. |

Apply this decision order for every new calculation:

1. **Does it affect a persisted business operation, clinical/financial decision, compliance
   decision, access rule, lifecycle transition or audit evidence?** Calculate or
   independently verify it on the backend from current database facts. Use DB
   constraints/transactions for invariants; never trust the submitted browser total.
2. **Does it require records not already fetched, a complete filtered dataset,
   sensitive fields or expensive processing?** Aggregate on the backend/database.
   Do not add broad data access or fetch every page merely to move arithmetic into
   the browser. Authorised aggregates may be returned without disclosing raw inputs.
3. **Is it a cheap display derivation from sufficient permitted inputs already
   available?** Calculate it in the frontend, reusing a pure typed utility and
   memoising when useful. Do not make an API call for every slider movement,
   comparison arrow, formatting change or chart redraw.
4. **Will the result be used for a business operation?** Submit source inputs
   and expected record versions; the backend recalculates, validates and returns
   the authoritative result. If values differ because data changed, show the
   returned result or a version conflict instead of silently accepting the preview.
   Persist only source facts/versions and the operation event; never the calculated result.

For example, a dashboard endpoint can return `numerator: 46`, `denominator: 50`,
`previous_numerator: 44`, `previous_denominator: 50`, scope, `as_of`, completeness
and definition version. Angular may display 92%, 88% and a +4 percentage-point
change locally. Eligibility, required-but-missing records and authorised source
counts are still determined by the backend. A saved report stores its definition and filters only; generation uses the
same versioned formula server-side against current scoped records. Likewise, a draft invoice may preview quantity
× rate in the browser, but approval reloads valid rates/source quantities and
calculates the total on the backend without storing it. Later reads calculate
again from the approved immutable input versions.

Frontend computations must preserve missing-versus-zero semantics, units, decimal
precision, rounding and timezone rules from this section. Use decimal-safe
arithmetic for financial previews; do not treat JavaScript binary floating-point
results as posted money. A partial page cannot produce a company-wide total, and
filtered-out or inaccessible records cannot be inferred from a local calculation.
An elapsed-time display can tick using server-provided time, but the browser clock
cannot determine authoritative late/missed status or SLA decisions.

Each calculated API field/metric definition documents `calculation_layer`
(`frontend_display`, `backend`, or `database`), input fields, formula version, scope,
completeness and rounding. These names describe execution, not ownership: all
source facts remain database-backed. The API may omit a redundant display `value`
when it supplies sufficient components and marks it `frontend_display`; document
that response variant in OpenAPI. Do not send hidden scoring keys, secrets or
extra clinical details to enable client calculations. Never send executable formula
code from database configuration to be evaluated in the browser.

Keep shared formula specifications and representative parity cases for calculations
used in both layers. On refetch, mutation, scope/company change or definition-version
change, discard derived values and recompute from the matching inputs. Keep display
results in component memory only while showing their input set; do not persist
them in localStorage, IndexedDB, Redis or database columns. Audit records retain
source changes, decision events and version references, not derived result copies.

### 9.2 Required metric definitions

The formulas below establish the default meaning. Any alternative must be a named,
approved, effective-dated definition. Frontend display calculations follow section
9.1.1 and use the same documented formula; they cannot redefine business eligibility.
"Applicable" always means a stored eligibility rule, not every row in the tenant.
All compliance formulas also return missing/unknown counts. Required-but-missing
evidence remains in the denominator; it cannot be excluded to inflate a score.

| Metric family / displayed cards | Database facts and calculation |
| --- | --- |
| Overall quality, Overall KLOE, Safe, Effective, Caring, Responsive, Well-led | Human assessment inputs and approved assessment answers grouped by framework area and applicable version; calculate statement scores on read. Apply stored weights and minimum evidence coverage; `sum(weight × score) / sum(weight)` only when coverage policy permits. Overall quality may differ from KLOE only with a separately named approved definition. No policy/valid scores means unavailable. |
| CQC/overall readiness | Required inspection criteria satisfied with current approved evidence divided by all applicable criteria, using the approved readiness policy; not an asserted official regulator outcome. |
| Person-centred outcomes / experience composites | Versioned weights over defined goal, preference, choice, involvement and wellbeing measures. Persist included dimensions and evidence coverage; missing mandatory dimensions make the composite unavailable. |
| Quality statements covered | Distinct applicable statements with sufficient current approved evidence divided by all applicable statements for the selected framework/service. Return both counts; never hardcode 44 or 32. |
| Approved evidence / items added / awaiting review | Distinct eligible evidence versions in approved or review state at cutoff; additions by actual creation/submission date according to definition. Distinguish inventory from new approvals during period. |
| Evidence gaps / areas requiring improvement | Unsatisfied applicable evidence requirements or approved below-threshold statement decisions; count requirement IDs or area IDs explicitly. Critical-gap card filters stored priority. |
| Outstanding/practice/extra-mile marks and stories | Sum approved awarded marks or count distinct approved practice entries in period; separate units/keys. A five-star gallery decoration cannot generate a mark. |
| Policies linked to evidence | Applicable current published policies with at least one valid approved evidence link divided by all applicable current policies. |
| Mock inspection score | Calculate the score of the latest completed approved internal inspection in scope from its answers and immutable rubric version. Recalculate the previous comparable completed inspection from its inputs for comparison; do not fabricate a monthly baseline. |
| High-risk/open actions, complaints, safeguarding and performance plans | Count distinct records in specified nonterminal states at cutoff, filtered by stored priority/type; include due/overdue counts separately. |
| Audit pass rate | Applicable completed signed-off assessments meeting their versioned pass rule divided by all eligible completed assessments; disclose incomplete scheduled assessments separately. |
| Falls, medication errors, all incidents and repeat themes | Distinct qualifying incident events by occurrence date/category; label reporting-date views separately. Repeat themes use stored coded classifications, not substring guesses over private notes. |
| Incident closure rate | Incidents opened in the selected cohort that are resolved by cutoff divided by all incidents opened in that cohort; distinguish this from the count closed during the period. |
| High-risk service users / heatmaps | Distinct active clients with current signed risk assessments meeting stored threshold, grouped by risk domain/location. One client may appear in multiple risk columns; total clients must deduplicate. |
| Controlled drug / IPC / environmental / fridge-storage compliance | Satisfactory required check items completed by due time divided by required applicable due check items; missed checks remain failures/unknown as policy specifies. Include current stock discrepancy records where relevant. |
| Pressure, wound, nutrition, MCA/DoLS and other clinical reviews | Applicable reviews completed/sign-off by deadline divided by reviews due in the period. Denominator comes from actual review schedules and client eligibility. |
| End-of-life planning readiness | Eligible clients with all required current plan/consent/contact elements divided by clients for whom that planning is applicable. Unknown applicability is disclosed. |
| MAR/medication compliance | Expected dose occurrences with valid policy-compliant documented outcome by cutoff divided by eligible expected dose occurrences. Report Given, Refused, Omitted, Absent and missing separately; compliance with recording is distinct from dose taken. |
| Medication safety indicators / stock | Missed or late doses use dose occurrences and outcome timing; PRN reviews use due review records; stock uses signed ledger quantities, with units and effective prescription/version. |
| Outcome goals achieved | Goals due in period with verified achievement by cutoff divided by eligible goals due. Do not count every open future goal as a failed due goal. |
| Care-plan goal progress / reablement / measurable domain improvements | Use goal/measurement baselines and target direction. A numeric goal can use bounded `(current - baseline) / (target - baseline)` with reversed scales handled explicitly. Equal baseline/target needs a separate achieved rule. Aggregate only comparable units or approved normalised scores. |
| Hospital admissions/A&E avoided, reduced deterioration, bed days saved | Count only reviewed avoidance records with observed intervention, clinical rationale and evidence. Estimated bed days require a documented approved estimation method and are labelled estimates. Do not infer avoidance from an absence of admissions. |
| Clinical task competence / practical competency pass rate | Staff/task requirements with current signed observed competence divided by applicable staff/task requirements; separately report passes among completed assessments if that is the selected metric. Course completion alone is not observed competence. |
| Preferences, communication preferences, life story and consent | Active eligible clients with valid required/current records divided by the eligible population; completeness uses versioned required fields and applicable consent/authority. |
| Continuity of carer | Delivered staffing slots assigned to a client's recorded regular/approved care team divided by all eligible delivered staffing slots. Report unassigned/missing actual worker records. |
| Family involvement / cultural-religious needs / accessibility needs met | Eligible consenting clients or recorded needs with documented involvement/reviewed accommodation divided by the applicable consenting clients/needs. Unknown or declined involvement must be disclosed, not assumed absent consent. |
| Dignity, respect, service-user/family satisfaction, emotional wellbeing, choice/control and social connection | Eligible genuine survey/assessment responses scored by stored question/version rules; return respondent count, response scale, positive threshold, response rate and period. Do not convert an unscored testimonial into a percentage. |
| Compliments and wellbeing activities delivered | Distinct verified compliment events and actual completed activities/participations; distinguish activity sessions from number of participating clients. |
| Call delivery / roster coverage | Completed eligible visits divided by scheduled eligible visits, or filled required staffing slots divided by required slots respectively. Approved cancellation rules are explicit; these are separate metrics. |
| Missed / late / on-time calls and live punctuality | Actual attendance versus planned start plus effective tolerance and server cutoff. Missing calls become missed after the policy deadline. Late buckets are disjoint, and totals reconcile to eligible calls. |
| Care-plan/service-user reviews on time | Applicable review obligations due in period completed by due time divided by due obligations; retain due dates, actual completion and versioned requirement. |
| Change requests responded to / implemented | Eligible requests with qualifying response or implemented change within stored SLA divided by eligible requests whose SLA deadline falls in period. Acknowledgment and implementation are separate events. |
| Urgent cover / average time to cover | Eligible emergency requests filled within policy SLA divided by eligible requests due; average elapsed actual request-to-confirmed-cover duration among covered requests, with unresolved/overdue counts shown. |
| Complaints response / team response / out-of-hours performance | Actual received-to-first-qualifying-response elapsed time, grouped by responsible team; mean/median are explicit. SLA compliance uses requests due within period, including unanswered overdue requests in denominator. Business-time SLAs require stored calendar rules. |
| Referral-to-start time | Actual accepted referral timestamp to first delivered visit; report mean/median, sample count and referrals still waiting separately. |
| Training / workforce / DBS-RTW compliance | Applicable staff requirement instances with current verified evidence divided by all due applicable instances. Composite workforce compliance requires stored weighting/all-required policy; disclose unverified/expired items. |
| Spot checks due / supervisions completed | Review obligations due in period and completed by deadline; type-specific schedules. No scheduled review is silently treated as completed. |
| Vacancy rate / staffing heatmap | Unfilled approved establishment FTE divided by required approved establishment FTE at cutoff. Use effective-dated establishment, contracted FTE and location allocations, not a guessed headcount. |
| Staff turnover | Leavers during the defined period divided by average active headcount over that period, with population and averaging method fixed in definition. Rolling 12-month card uses that exact window. |
| Sickness rate | Sickness absence hours divided by scheduled/contracted eligible hours for the period under the approved policy; nonworking hours excluded consistently. |
| New starters in induction / performance plans open | Employment starts in period with incomplete mandatory induction; open typed improvement plans at cutoff. |
| Recruitment funnel / time to hire / acceptance rate | Application stage events within a defined cohort; median/mean application-to-accepted-offer or vacancy-open-to-hire definition stated. Accepted offers divided by decided offers for acceptance rate, with pending offers disclosed. |
| Staff quality league table | Approved comparable staff-level metrics with documented weights, denominator and minimum sample size; unavailable/small-sample rows are not fabricated or silently ranked last. |
| CAPA completion / overdue / due this month | Cases due in period completed with required effectiveness review by cutoff divided by eligible cases due; backlog and status inventory are separate counts. |
| Improvement projects on track | Active projects meeting stored milestone/variance rules divided by eligible active projects with a valid approved plan; weighted progress from evidenced milestones. |
| Branches requiring support / intervention queues / early warnings | Versioned threshold rules over current metrics or validated forecast results, persisted alert identity/status/source evidence. Deduplicate continuing alerts; count newly raised separately. |
| Predicted noncompliance, staffing pressure, overdue plans, medication risk, repeat incident risk and sentiment risk | Approved forecast/model outputs with target, input window, horizon, validation, uncertainty and model version. Deterministic already-due counts are labelled rules-based projections. Without adequate data/validated model return unavailable. |
| Pay, work, invoices, balances and partial payments | Decimal source quantities × frozen effective rates plus authorised adjustments/tax where configured; sum line totals, payment/credit/reversal ledger and outstanding balances. Show exact calculation basis and currency. |

### 9.3 Supporting metric facts and configuration

Add the following A + T tables to support formulas that the demo currently does
not model fully. Expose RCU endpoints at the C paths listed, with draft edits and
controlled approval/transition actions as needed:

| Table / endpoint | Minimum domain columns |
| --- | --- |
| `requirement_rules` / `/requirements/rules` | Requirement type, applicable staff/client/service group, effective dates, recurrence, evidence rule and approval |
| `requirement_instances` / `/requirements/instances` | Rule/version, subject, due date, completion source/time, exemption decision and evidence; unique generated obligation key |
| `staffing_establishments` / `/staffing-establishments` | Location/role, effective range, required FTE/hours, approver; nonnegative values |
| `staff_location_allocations` / `/staff/{id}/location-allocations` | Staff/location, effective range, allocated FTE/hours; no double-counted contracted allocation |
| `absence_records` / `/staff/{id}/absences` | Sickness/other type, actual start/end, hours, approval/source; restricted medical detail |
| `survey_definitions`, `survey_questions` / `/surveys` and `/surveys/{id}/questions` | Versioned audience, scoring scale, positive threshold, required questions and consent policy |
| `survey_invitations`, `survey_answers` / `/surveys/{id}/invitations` and `/feedback-responses/{id}/answers` | Eligible respondent/cohort, invitation/delivery/response dates; response/question version, value and explicit anonymity handling |
| `service_calendars`, `calendar_exceptions` / `/service-calendars` and `/service-calendars/{id}/exceptions` | Timezone, working hours/weekdays, holidays and SLA calculation policy |
| `early_warning_alerts` / `/quality/early-warning-alerts` | Subject/location, approved rule or forecast run, raised/resolved time, severity, evidence, assignee and deduplication key |
| `performance_plans` / `/staff/{id}/performance-plans` | Plan type, agreed goals, start/due dates, state, reviewer and linked performance evidence |

Requirements are generated by idempotent scheduled jobs using the exact effective
rule version; edits cannot erase overdue history. Add `POST .../{id}/approve` and
`POST .../{id}/new-version` for requirement rules, staffing establishments and
surveys; `POST C/requirements/instances/{id}/complete` and
`POST C/requirements/instances/{id}/exempt` require linked source evidence and
appropriate authority. Add `POST C/quality/early-warning-alerts/{id}/transition`
and `POST C/staff/{id}/performance-plans/{plan_id}/transition` with audited reasons.
Public or family survey responses use a separate narrowly scoped, expiring
invitation token route, `POST /api/v1/public/survey-invitations/{token}/responses`;
it must not grant list/read access to other respondents or the client file.

### 9.4 Live reads and forecast provenance

Do not create `metric_snapshots`, `forecast_values`, result-cache tables, stored
calculation columns, materialised views or scheduled jobs that persist derived
business figures. Use ordinary SQL queries/non-materialised views and backend
query services to calculate at request time. Store definitions, input facts,
immutable source revisions and execution metadata only. Formula changes create
new definition versions rather than rewriting source history.

Live means the response reflects committed source data at its query boundary;
it is not a promise that an already-open screen updates without another request.
Return `as_of`, applied scope, definition version and source watermark. Use a
consistent read transaction for a multi-panel response. The frontend refetches on
relevant events/mutations, company/filter changes, reconnect and an appropriate
refresh interval. Event streams can invalidate affected queries; do not store
aggregate results as a shortcut. Avoid stale response caches/read replicas for
live calculations unless they provide the required current read consistency.

Reduce load with appropriate source-table indexes, bounded periods, batched
aggregations, query optimisation and frontend arithmetic on already-fetched
components. Never download inaccessible/excessive raw data or introduce persisted
calculation results to reduce load. Long-running report/forecast requests can
stream their output; durable jobs retain progress, source references and errors,
not derived business output. Downloads regenerate from authorised source records.
Generated reports/exports/certificates containing computed figures are streamed,
not saved as calculated file chunks; uploaded original documents remain source
records. A historical report explicitly selects source versions/events and is
recomputed from those inputs instead of a saved output.

Forecast definitions record target/units, approved method/model version,
feature-definition version, horizon and source eligibility. Execution records
retain who requested it, scope, input version references and execution times;
compute estimates, validation metrics and uncertainty on demand. Do not persist
forecast numbers or use an old forecast as a current fact. A reviewed human action
or finding based on a forecast is a separate attributed source event, not a saved
prediction score. Do not turn random numbers or fixtures into predictive claims.
Review recommendations before executing changes; a prediction cannot automatically
administer medication, change a care plan or approve finance.

## 10. Critical transaction and workflow requirements

1. **Write services.** Start a transaction, resolve actor/company/permissions, lock
   the current row and relevant contention rows, enforce ETag/version and state,
   validate related records, write domain changes plus audit and outbox, then
   commit. Enqueue external work after commit through the durable outbox. External
   network timeouts cannot leave half-approved local records.
2. **Visit generation.** Use a unique package-version/service-date/occurrence key.
   Make local-time recurrence rules explicit for nonexistent/repeated DST times.
   Lock staff/time reservations during allocation; validate availability, approved
   leave, skills, required staffing slots, travel, driving and effective employment.
   An override requires a permitted named rule, reason and authoriser. Publish an
   immutable version; notify only after commit.
3. **Attendance.** Require eligible staff/visit, permitted time window and an open
   attendance interval for checkout. Reject duplicate/out-of-order events or route
   them through explicit correction. Keep observed event time, received time and
   recording actor separately. Payroll/billing use an approved duration policy.
4. **Medication.** Lock the occurrence and relevant stock/PRN contention records;
   enforce current prescription, competence, maximum dose/window and witness
   policy. Save administration, stock movement, audit and outbox atomically.
   Corrections append linked replacement/reversal events; do not overwrite MAR.
5. **Clinical sign-off.** Bind signatures to an immutable record version and digest;
   record authenticated signer, intent and time. Submitted/signed records reject
   ordinary edits. Reopen with reason, create a new version and retain prior
   signatures as historical rather than copying them onto changed content.
6. **Finance.** Freeze effective rates/source quantities at approval or locking.
   Unique consumption constraints and row locks prevent duplicate run/invoice
   allocation. Allocate document numbers transactionally without requiring
   gaplessness; keep cancelled numbers. Reject overpayments/duplicate transaction
   references and use append-only reversals/credits for correction. Approver
   separation follows the stored workflow; absence of policy never grants approval.
7. **Learning.** Lock attempt submission and validate the grading against exact
   question/rule versions. Persist submitted answers and submission event once;
   calculate score/pass on each read without storing them. Respect expiry, allowed
   attempts and assignment version. Certificate issuance records its attributed
   decision/source versions idempotently; render calculated content on demand.
8. **Approvals.** Enforce allowed transitions and current source version. Reject
   self-approval when separation is required, approval by suspended users and stale
   requests after the underlying record changes. Save required reason/evidence.
9. **Notifications.** Business state, queued outbox, delivery attempt and provider
   acceptance/delivery/read receipt are different facts. Deduplicate retries by
   stable event/recipient/channel key. Verify webhook signatures before updating
   receipts; preserve errors and retry counts.
10. **Archive/retention.** Archive mutable masters only after relationship checks.
    Retain clinical, financial, signed, published and append-only history. Define
    approved retention/anonymisation schedules by data category; execute restricted
    audited jobs. Soft deletion alone does not satisfy every retention need. Do not
    cascade-delete the tenant's history when a user, client or staff member leaves.

## 11. Frontend integration and data migration

### 11.1 Replace every data owner

| Current source | Backend owner / integration |
| --- | --- |
| Auth/workspace services and local security state | `/auth`, `/me`, scoped memberships/permissions; server sessions and current DB entitlements |
| `ManagementStore` company/location/workforce/client/recruitment state | Organisation, HR, recruitment and client APIs with paginated queries |
| Academy service and learner/admin stores | Versioned courses/assignments/attempts/CPD/certificates APIs |
| Care/client-file/family service state | Structured client/care records, MAR/stock and grant-scoped family APIs |
| Rota and ECM services | Shared visits/allocations/publications/attendance and live ECM APIs |
| Journal and staff-portal services | One journal/task/concern/professional-communication domain; own/team projections |
| Payroll and finance services | Work, profiles, locked pay runs, invoices and immutable payment ledgers |
| Quality service and `quality-dashboard.models.ts` fixture arrays | Assessment/evidence/quality resources and DB-backed Rich KPI facts/aggregates; lightweight display derivations may run in Angular under section 9.1.1 |
| Inspector service | Source projections plus inspection-owned findings/notes/reports |
| Browser attachment/object URLs, generated CSV/PDF mocks and backup buttons | Uploaded source-file versions and real export/backup/job APIs; calculated exports stream on demand |

Angular services may retain current permitted source responses in rendering memory, but
must invalidate/refetch after mutations, company switches and access revocation.
Do not download the entire company workspace and filter it only in the browser.
Use server pagination/search/counts, explicit loading/empty/error states and
optimistic concurrency. A route guard and hidden menu item are convenience only;
backend permissions enforce all operations. Keep branding and navigation concerns
in presentation code, separate from authoritative data and scoring policies.

Maintain a route-to-API coverage checklist during implementation: inspect every
route, tab, form, card, chart, row action, filter, upload, print and export. Register
its source endpoint, fields, permissions and mutation command. An implemented API
is not complete while a reachable page still reads demo business data. Existing
frontend types are a field inventory; derive final request/response types from
OpenAPI and use adapters for display formatting instead of storing formatted
currency/date/percentage strings as source facts. Calculate lightweight display
derivations locally where section 9.1.1 permits; keep committed business calculations
and validation on the backend.

### 11.2 Migration sequence

1. Implement base audited models, database constraints, scoped repositories, identity,
   permissions and migrations. Create service principals and reviewed permission,
   module/framework/field/template catalogues through controlled data migrations.
   Keep development/demo business fixtures outside production startup.
2. Implement durable jobs, audit, outbox and file persistence before workflows that
   depend on them. Provision actual tenant/company settings and access explicitly.
3. Implement source domains before their summaries: workforce/clients/care, visits/
   attendance/MAR, communications, learning, finance and quality/inspections. Add
   validated metric definitions only when their source facts exist; calculate results
   on demand and do not add derived-result columns or tables.
4. Inventory existing browser-local records. Export only through an explicit,
   authorised migration flow. Treat historical browser actors, totals, roles,
   timestamps and attachments as untrusted legacy claims; do not silently turn
   sample names/April 2025 dashboard fixtures into real operational history.
5. Dry-run each import with tenant ownership, schema/version, duplicate matching,
   foreign-key mappings, required evidence, file digest and row errors. Commit only
   the reviewed valid set; retain legacy-to-new ID mapping, import job and source
   manifest. Record the real importing actor/time separately from legacy dates.
6. Reconcile source counts, relations, balances, stock and representative calculated
   outputs. Switch each domain's Angular service completely to the API, remove its
   production seed/localStorage path and verify deep links and all role views.
7. Finish cross-domain reconciliation and operational restore checks before release.
   Preserve a rollback plan that does not lose writes made after cutover.

Do not ship silent dual writes to browser storage and PostgreSQL. If staged rollout
requires dual systems, define the authoritative writer, reconciliation and cutover
explicitly rather than resolving conflicts with whichever response arrives last.

## 12. Verification, operations and completion criteria

### 12.1 Required backend checks

Use real PostgreSQL for integration tests involving constraints, transactions,
range exclusions, RLS, JSONB and locking; SQLite cannot verify those behaviours.
Test at least:

- Cross-company, cross-branch, assigned-client, family-scope, inspector and revoked
  session isolation, including detail IDs, list counts, search, files, exports and
  event streams. Verify list/queryset filtering independently of object checks.
- Audit columns/actor attribution on create, PATCH, bulk commands, scheduled jobs,
  imports and service writes; rollback of both business write and audit on failure.
- All allowed/forbidden state transitions, stale ETags, missing preconditions,
  repeated idempotency keys, mismatched bodies and concurrent conflicting requests.
- Duplicate/overlapping allocations, recurrence DST boundaries, multi-carer calls,
  attendance corrections, no double billing and exact rate-effective boundaries.
- Concurrent MAR/PRN requests, stock reversals, correction history, wrong units,
  mandatory witness/competence and prohibited backdated overwrites.
- Server-only grading, expired attempts, repeated submission, hidden answer keys,
  immutable course versions and idempotent certificate issuance.
- Decimal finance calculations, partial payments/reversals, duplicate work sources,
  locked source versions and reconciling on-demand run/invoice totals to their source ledger.
- Frontend/backend formula parity where shared, preview-versus-committed results,
  partial-page totals, stale input versions and refusal to trust submitted totals.
- Known-empty versus unavailable, zero denominators, required-but-missing evidence,
  weighted branch aggregation, period comparisons, historical cutoffs, sparse data
  and prevention of fixture fallback in every dashboard.
- Quarantined/incomplete files, parent permission checks, revoked family downloads,
  byte-range streaming, checksum validation and oversized/invalid uploads.
- Failed provider delivery, duplicate webhooks, worker restart/retry, job scope
  rechecks, concurrent source changes and expiry/revocation before generated downloads.

Generate OpenAPI and check route/serializer/permission coverage in CI. Test migrated
frontend flows against a real backend with controlled fixtures; existing frontend
unit tests alone do not prove backend persistence or permissions. Keep test data
isolated from production and exclude secrets/private records from snapshots/logs.

### 12.2 Operational baseline

Use separate web and worker processes with PostgreSQL migrations as a controlled
release step. Configure database connection limits, statement/lock timeouts, worker
retry policy, upload limits and job retention. Scope DB credentials: application,
migration, backup and operations roles are distinct. Runtime credentials must not
bypass tenant isolation. Never expose Django debug mode or raw SQL/errors publicly.

Use a secret store/environment references for Django/session secrets, database
credentials, encryption keys and provider credentials. Do not commit actual values
to this document, settings files or frontend bundles. Encrypt sensitive stored
secrets; hash credentials that need only verification. Log request/job correlation,
redacted operational errors and calculation version, not private clinical payloads.

Back up PostgreSQL including file chunks, audit and encryption-key recovery
material through a separately protected process. Define recovery point/time targets,
verify checksums, and regularly restore into an isolated environment to reconcile
records, constraints and downloadable files. A job marked requested or completed
without a verified artifact is not a successful backup. Whole-database restore is
an operations procedure; tenant restore requires a validated dependency-aware
staging/import process and cannot overwrite another tenant.

Monitor failed jobs/outbox backlog, denied access, database capacity, audit writes,
slow live metric queries, refresh failures, file growth and reconciliation failures.
Index from measured query plans and bound dashboard queries by permitted scope and
period. Do not cache derived business results. Any source-data read replica must meet
the live-read consistency requirement, particularly for clinical, finance and
attendance decisions.

### 12.3 Definition of complete

- Every reachable application page and action has a documented, implemented and
  permission-tested API operation; OpenAPI matches the implementation.
- Every business value is read from PostgreSQL or calculated from persisted facts;
  no calculated result is persisted in DB columns, snapshots, materialised views
  or result files/caches. Lightweight display calculations follow section 9.1.1, and authoritative results
  are verified server-side. No production demo/localStorage fallback or invented
  chart history remains.
- Every physical business/configuration/association table includes the audit columns
  from section 4 and tenant scope where applicable; immutable history is enforced.
- All nine Rich KPI pages use registered, versioned formulas, real drill-down
  sources, correct periods/denominators and honest unavailable states; refetching
  reflects current committed source changes.
- Uploads, invitations, notifications, exports, payments, backups and provider tests
  report actual persisted progress/outcomes rather than simulated success.
- Tenant/role/family/Inspector boundaries, audit integrity, concurrency, financial
  and stock reconciliation, production migration and restore checks pass.

## 13. Repository inventory used for this contract

The implementation must recheck these sources as the frontend evolves:

- [Application routes](src/app/app.routes.ts), [authentication](src/app/core/auth/auth.service.ts)
  and [workspace service](src/app/core/auth/workspace.service.ts).
- [Management store](src/app/features/management/shared/management.store.ts), company,
  locations, people/HR and recruitment feature models and services.
- [Client-file models](src/app/features/management/clients/client-file.models.ts),
  [care models](src/app/features/management/care/care.models.ts),
  [family models](src/app/features/management/care/family-portal.models.ts).
- [Academy models](src/app/features/management/learning/academy/academy.models.ts),
  [rota models](src/app/features/management/rota/rota.models.ts),
  [ECM models](src/app/features/management/ecm/ecm.models.ts).
- [Journal models](src/app/features/management/journal/journal.models.ts),
  [staff portal models](src/app/features/management/staff-portal/portal.models.ts).
- [Payroll models](src/app/features/management/payroll/payroll.models.ts),
  [finance models](src/app/features/management/payroll/finance/finance.models.ts).
- [Quality models](src/app/features/management/quality/quality.models.ts),
  [Rich KPI fixture inventory](src/app/features/management/quality/quality-dashboard.models.ts),
  [Inspector models](src/app/features/inspector/inspector.models.ts).

This contract defines the intended backend. Database migrations, actual endpoints,
workers and production integration remain implementation work until built and
verified against the completion criteria above.
