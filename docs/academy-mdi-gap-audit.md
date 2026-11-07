# CareVerity Academy — MDI completion and build-capacity audit

Reviewed: 6 November 2026 (Africa/Nairobi).

Authority: `careveritytrainingacademy/03_CareVerity_Academy_MDI.docx`, CV-MDI-ACADEMY-01 v1.0, dated 5 November 2026. Scope supplied by the product owner: Angular frontend with seeded data. This review covers the Academy, shared Staff Portal, existing HR training/documents, rota checks and reporting. It is a source-code audit, not a new run of all acceptance demonstrations. No application behaviour was changed during this audit.

“Seeded implementation present” means the workflow exists using browser records. It does not mean production server/security acceptance has been achieved. The previously recorded 105 Academy/Staff Portal checks cover implemented behaviour; they are not a substitute for the MDI acceptance matrix.

## Naming: the actual instruction

MDI §0 says: “The official name is CareVerity Academy.” It explicitly prohibits KFLT Training Academy, KFLT Care Academy and CareVerity Training Academy as public-facing software names. Sections 11 and 16 explain that KFLT lettering belongs to the superseded mockups. The required parent-platform name is CareVerity ECM.

The new Academy page headings generally use the correct name. Remaining visible labels include Training Academy in the administration sidebar and Staff Portal, and Training academy in the company module catalogue. These need a display-name mapping to CareVerity Academy. Internal module/permission keys, route names and historic IDs must be retained. There is no need to replace those storage keys to correct visible wording. A naming inventory and release/change-control entry are also required.

Evidence: `src/app/features/management/layout/management-layout.ts:84`, `src/app/features/management/staff-portal/portal-shell.ts:62`, `src/app/features/management/companies/company-modules.models.ts:19`, and the MDI §0.

## Existing baseline

The ten-screen workflow is substantially represented: dashboard; course creation and publication; course-owned video/resources; modules and lessons; grouped quizzes/surveys; role/team/person/HR-profile assignments; learner lessons and assessments; selected-staff results/retakes; selected-staff certificates/compliance. The shared application shells, course and question snapshots, weighted/critical marking, attempt limits, manual retake scheduling, local PDF generation and exact-worker HR filing, renewal reminders, revocation, reports and separate practical checks exist.

The missing items below are additions or corrections to that baseline, not claims that entire screens are absent. Optional QR verification, optional additional question formats and a native mobile application are not treated as unconditional missing requirements; the MDI allows mobile/web and initially limited question types.

## Frontend and seeded-workflow gap register

Capacity “Yes” means this workspace can implement and test the feature with seeded records. Real delivery/security guarantees still need the corresponding production services.

| ID | MDI | Current limitation / remaining work | Capacity and inputs needed |
| --- | --- | --- | --- |
| F01 | §0, §11 | Complete visible product naming in both menus, company module displays and associated guidance; record the naming inventory/change entry. | Yes, now. Use CareVerity Academy. Retain historic/internal identifiers. No backend needed. |
| F02 | §4.1 | Course audience supports roles but has no branch applicability field. Course-level prerequisites are not modelled; existing prerequisites are modules/lessons. | Yes. Reuse canonical branches and course IDs; add editors, validation, frozen snapshots and learner/assignment gates. Define policy for expired prerequisites and accepted historical versions. |
| F03 | §§4.1, 7.1, 10 | Course learning-evidence type and a structured renewal-policy reference are absent. Current certificates default to internal knowledge completion; a practical-required flag is not an evidence-type model. | Yes for internal evidence fields and policy references. Approved practical/accredited/portable categories and issuing authority need product/provider decisions before they can award a different evidence type. |
| F04 | §6 | Assignment source, priority and due date exist, but there is no optional supervisor/owner linkage for an individual learning assignment. | Yes. Use existing staff IDs and an eligible supervisor selector; preserve assignment history. Provider supplies allowed supervision roles. |
| F05 | §§4.2, 10 | Asset metadata lacks explicit checksum, per-asset rights/licence, media version and structured accessibility-review record. Caption language is hard-coded English in the learner player. Upload preview displays duration/resolution without a full persisted media-metadata model. | Yes for seeded metadata, local checksum, language selection, review actor/date and replace/version history. Real scan/transcode metadata must come from the media service. |
| F06 | §5, §12 | Course timers/untimed mode exist; no individual reasonable-adjustment approval, reason or effective assignment/attempt override. | Yes. Add scoped extra time/untimed adjustments, approver, reason, audit and frozen attempt values. Provider defines who may approve and applicable rules. |
| F07 | §5 | Feedback is controlled by a boolean release-after-submission setting. There is no richer release-time/approval policy. | Yes. Define supported release policies, freeze them per assignment and apply the same rules to result pages, topic analysis and response projections. |
| F08 | §5; A13 | Exhaustion displays Manager review required; support requests create notices. There is no managed remedial case with reviewer, actions, decision, due date and resolution. | Yes. Add a manager queue and linked review record. Provider defines remediation and permitted next actions; no hidden score or attempt reset. |
| F09 | §§5, 7.4 | Attempts have no INVALIDATED/correction lifecycle. Certificate revocation exists, but an authorised correction/reissue chain linking replacement and original is absent. | Yes for the seeded workflow. Requires approved correction permissions and reason/evidence rules. Keep original result/PDF/audit. Production issuance must be transactional. |
| F10 | §6; A06, A21 | Renewal schedules/reminders and manual refresher assignment exist. No automatic creation of refresher assignments from approved renewal rules; no policy records covering effective-dated role/branch intervals or configurable reminder stages. | Yes for an in-app seeded scheduler with deduplication and prospective policy versions. Provider supplies renewal policy. Execution while the application is closed needs a backend scheduler. |
| F11 | §§6, 9 | Notifications record Recorded/Not configured and local notices. No queued/sent/delivered/failed lifecycle, provider message IDs or retry history. | Yes for UI/data models and simulated delivery outcomes. Real channel states need a messaging provider and delivery callbacks. Do not relabel local notices as sent externally. |
| F12 | §§8.2–8.3, 10 | Mandatory knowledge requirements are inferred from published courses and target roles. Missing a configurable role/branch/service/task requirement and accepted-evidence model, version requirements and required review states. | Yes. Build requirement policies, evidence acceptance, effective dates and explainable currency states. Provider defines the policy; canonical organisation/service data is needed for live use. |
| F13 | §§8–9; A17, A23 | Rota call skills validate against fixed COURSES, and general HR readiness uses that fixed mandatory list. New Academy courses are not consistently selectable/enforced across these checks. Practical checks are course-level, without person/location-specific delegated task authority. | Yes. Reuse one requirement resolver across Academy/HR/rota, permit published course requirements, and add scoped observed-task authorisations. Provider must approve task rules, assessor permissions and expiry/restriction policy. |
| F14 | §§3, 7.1, 10 | The automatic stored-PDF renderer skips uploaded provider logo/background/signature images in its data-only path. Screen 10 has a fixed preview treatment and no explicit template-version field. Other authorised preview/download paths are not all routed through the same canonical filed-PDF access/audit operation. | Yes, now. Use one frozen template/asset snapshot for preview and generation, retain template version, serve the filed artifact, and audit every authorised access path. Approved issuer/signatory assets must be supplied for actual provider use. |
| F15 | §3 | Broad canManage permission covers authoring, publication, assignments, settings, revocation and retry; HR is in the default management roles. There are no time-limited/scoped reviewer grants or approved diagnostic/break-glass access workflow. | Yes for seeded capability separation and access-grant screens. Provider approves the permission matrix. Real enforcement requires server identity/authorisation. Platform Owner is not assumed to be identical to the MDI’s separate support role. |
| F16 | §§9, 12–13 | Evidence-pack export omits question/answer fields from attempts but serialises whole assignments, including question snapshots and learner notes. QA/compliance can read evidence, while the general export method uses a management-only audit operation. | Yes, now. Use explicit redacted export projections and an approved read/export capability. Test that answer keys/private notes cannot enter inspection exports. |
| F17 | §§3, 7.1, 12 | Worker records requests and HR acknowledgement exist, but there is no recorded disclosure decision/outcome, completion trail or defined portable-qualification handling. | Yes for request workflow/status and controlled disclosure record. Organisation supplies its approved disclosure/qualification policy. Actual secure delivery needs an approved channel. This does not require routine learner PDF shortcuts. |
| F18 | §§9, 13 | Academy reports exist, but course-final and module-quiz attempts are mixed in some report averages/trends. A shared KPI definition/projection into Rich KPI/VerityInsight360 was not found; that area has separate seeded data. | Yes. Define course-final versus checkpoint denominators, share projections, and add source-linked drill-downs and sync/eligibility metrics. Authorised metric definitions and reporting scope must be agreed. |
| F19 | §8.1 | HR assignment rows link Inspect evidence to the general certificate register, rather than the exact certificate/staff detail. Required evidence metadata is distributed between training, documents and Academy detail views. | Yes, now. Add exact-source links and a complete HR evidence row/drawer without duplicating records or broadening permissions. |

### Supporting source locations

- F02–F07: `academy.models.ts` policy/course/assignment/media interfaces; `academy-course-editor.html`; `academy-content-editor.ts`; learner `<track>` label/language in `academy-learner.html`.
- F08–F11: `academy-results-review.ts`, `academy.service.ts` notifyManager/scheduleRetake/applyAssignments/generateReminders; `academy-demo-workflow.ts` checkRefresherReminders.
- F12: `academy.service.ts:486` knowledgeCompliance; it currently has no branch/service/version acceptance policy.
- F13: `rota.service.ts:219` fixed skill catalogue; `rota.service.ts:274` skillConflicts; `people/hr.models.ts:318` readiness.
- F14: `academy-demo-workflow.ts:29` calls the PDF renderer with data-only mode; `academy-pdf.ts` excludes uploaded branding images in that path. `academy-learner.ts:599` generates a PDF through a separate method. `people/staff-profile.ts` has generic document preview/download methods. Only the selected-staff compliance page currently calls recordCertificateAccess.
- F15: `academy.service.ts:61` canManage and `academy.models.ts` default adminRoles.
- F16/F18: `academy-reports.ts:230` evidence pack includes raw assignments; attempts() and months() include submitted non-survey module quizzes as well as final attempts.
- F17: AcademyAccessRequest has Requested/Acknowledged states only.
- F19: `academy-staff-training.ts:57` links to the general register.

## Production services and operational requirements

These are not solved by adding frontend pages. There is capacity to implement clients, contracts, local demonstrations and backend code once the service architecture and integration boundaries are established. Live completion also requires running services, credentials, authoritative data and operational ownership.

| ID | MDI requirement not delivered as a live production capability | What is needed to build and operate it |
| --- | --- | --- |
| P01 | Server-enforced tenant/RBAC security, staff identity binding, MFA and protected keys/files. Current learner identity is matched to seeded staff by email and browser state is not a security boundary. | Authenticated tenant/staff identity contract, existing identity provider, server-side permission checks, private file/media authorisation, approved role/access matrix and integration environment. |
| P02 | Authoritative assessment save/marking, lifecycle, reconnect reconciliation and concurrency guarantees. | Assessment APIs/database, server-only answer keys, immutable published snapshots, idempotent submit, unique result/issuance constraints and conflict/reconnect protocol. |
| P03 | Quarantined upload, malware scan, safe transcoding, private streaming and expiring access URLs. | Storage, upload API, scanner/transcoding workers, queue, media pipeline policy, rate limits and authenticated delivery. The existing signature/extension checks and simulated states remain useful client validation. |
| P04 | Encrypted canonical certificate storage and real HR document/matrix/rota acknowledgements. | HR/document API contracts and canonical staff keys, encrypted object storage, certificate worker, training/rota event contracts, environment access and error/retry semantics. |
| P05 | Durable outbox, automatic backoff retries, daily reconciliation, support alerts and recovery after restore. Current browser processor skips SYNC_EXCEPTION until manual retry; legacy reconciliation targets sample certificates rather than all unmatched production passes. | Database transaction/outbox, durable queue and scheduler, idempotent consumers, dead-letter handling, observability/alerting, complete reconciliation and restoration tooling. |
| P06 | External email/SMS/push notifications and reliable background renewals. | Approved provider/channel configuration, credentials, templates/preferences, worker scheduling, delivery callbacks, failure/retry tracking and appropriate operational policy. |
| P07 | Restricted immutable audit, retention, backup/restore, support access and privacy controls. | Audit storage, retention/backup policy, secure export/disclosure delivery, approved diagnostic access, environment controls and recovery exercises. |
| P08 | Performance/availability objectives and capacity acceptance. | Agreed tenant/concurrency targets, representative environment and data, load testing and monitoring. The proposed 95% within 60 seconds certificate pipeline is an objective requiring validation, not a demonstrated SLA. |

## Acceptance criteria: all 26 scenarios

This is a status map, not a declaration of formal acceptance. “Seeded present” still requires live/server evidence where the MDI calls for it.

| Test | Current assessment | Remaining evidence/work |
| --- | --- | --- |
| A01 Course with media/questions/renewal | Seeded present; partial production | F02–F05 for missing metadata/policy; P03 for real media readiness. |
| A02 Published-course edits retain history | Seeded present | Server immutability/concurrency verification under P02/P04. |
| A03 Unsafe/unready media rejected | Partial | Basic format/readiness gates exist; real quarantine/scan/transcode and failure recovery need P03. |
| A04 Module reorder preserves sequence/progress | Seeded present | Broader device/UAT verification and authoritative progress persistence. |
| A05 Existing HR-profile assignment | Seeded present | Live authenticated canonical staff/tenant API verification. |
| A06 Refresher due to expire | Partial | Manual refresher and local notices exist; F10/F11 and P06 remain. |
| A07 Own mobile learning/resume | Responsive web present | Real-device, captions/keyboard/screen-reader checks and live cross-device persistence. |
| A08 Answer-key request denied | UI projection only | Server/source-payload denial and audit under P01/P02; F16 export redaction. |
| A09 PASS once with frozen score/version/trace | Seeded present | Server-authoritative transaction, rubric and concurrency evidence. |
| A10 Critical-question failure blocks pass | Seeded present | Authoritative service acceptance. |
| A11 Duplicate submit/reconnect | Local duplicate-submit handling present | Concurrent sessions/workers and offline reconciliation under P02. |
| A12 Policy-controlled failed retake | Seeded present | Live notification/scheduling and server ownership/time enforcement. |
| A13 Final attempt escalates to manager | Partial | F08 managed review/escalation and approved resolution. |
| A14 Professional accurate PDF generation | Partial | F14 template/asset consistency/versioning; approved issuer/assets and live worker. |
| A15 Exact HR attachment | Seeded present | Live encrypted central storage and exact-worker acknowledged API link. |
| A16 Matrix and learner updates | Seeded present; policy incomplete | F12 requirement engine and shared authoritative projections. |
| A17 Rota suitability refresh | Partial | F13 custom-course/requirement consistency and scoped practical authority; live propagation. |
| A18 HR outage and once-only retry | Seeded outage/retry present | P04/P05 real outage, automatic retry and transactional idempotency evidence. |
| A19 Wrong worker/tenant/guessed ID | UI/store checks present | Server/file/queue-consumer rejection tests and audited authoritative keys. |
| A20 Certificate revocation | Seeded present | F09 correction/replacement chain; live propagation, retention and concurrency evidence. |
| A21 Prospective renewal-policy change | Assignment/course snapshots present; partial | F10/F12 effective-dated policy records, scope and migration behaviour. |
| A22 Learner internal PDF denied | Normal frontend access restricted | Server signed-file/HR endpoint enforcement; complete access-path audit F14/P01. |
| A23 Training current but practical sign-off missing | Course-level distinction present | F13 observed/scoped authorisation model and requirement integration. |
| A24 Daily reconciliation/backup restore | Incomplete | P05/P07 all-record reconciliation, restoration and no-duplication demonstration. |
| A25 Every success badge source-backed | Many badges use stored acknowledgements | Complete cross-page source/validity audit after F12/F13/F18; live service evidence. |
| A26 Live app-to-HR-to-rota recording | Not demonstrated as production | Connected environments, representative test staff/data and recorded formal UAT. |

## Verification, decisions and handover still required

- WCAG 2.2 AA review: keyboard/focus, screen readers, contrast, captions/transcripts and approved exam adjustments across all flows. Responsive screenshots alone do not establish this.
- Full Academy desktop/mobile visual comparison; prior browser captures cover learner, quiz, selected results and selected certificates, while earlier checklist sections still contain unverified visual items.
- Approved issuer/signatory, evidence categories, course pass/attempt/renewal policies, practical authorisation rules, correction permissions, retention and disclosure policy. Internal knowledge certificates remain the safe current default until alternatives are approved.
- Architecture/sequence diagrams, canonical key and API contracts, full requirement-to-test traceability, migration/change control, operational runbook, training materials, support ownership, rollback/pilot plan and named reviewers. Existing handoff/checklist files provide a starting point but not all required signed artefacts.
- Formal sign-off under MDI §17: product, backend/key integrity, privacy/storage/access, competence/rota rules and QA/UAT.

## Recommended build order

1. F01 naming; F14 canonical PDF/branding/access; F16 export redaction; F19 exact HR evidence links.
2. F02–F04 profile/assignment metadata; F12/F13 shared requirements and rota consistency; F15 capabilities.
3. F06–F09 adjustments, feedback and managed review/correction; F10/F11 renewal and notification lifecycle; F05 asset/accessibility metadata.
4. F17/F18 disclosure workflow and reporting/KPI consistency, then full frontend accessibility/device/UAT coverage.
5. Connect and validate P01–P08 before describing the Academy as production-complete under the MDI.

No additional external service is necessary to build the seeded frontend features. Required provider policies can be represented with explicit draft/example configuration during development; approved real policies and issuer details are necessary for live operation. Backend implementation is technically feasible, but live integration cannot be completed from screenshots, local records or a frontend-only repository alone.

## Implementation update — 6 November 2026

The frontend work in F01–F19 has now been implemented as seeded/local workflows. The gap table above is retained as the pre-implementation audit. The detailed completion record and walkthrough are in `academy-implementation-checklist.md` and `academy-service-handoff.md`.

Policies & Reviews supplies the review, adjustment, requirement, renewal, delivery, access, disclosure and recovery workflows. Course/media authoring, learner gates/feedback, HR readiness, rota requirements, canonical PDF access and shared KPI/export projections use those records. Diagnostics-only support access has a separate restricted route. Changes preserve source IDs/history and do not grant clinical or accredited authority from a knowledge quiz.

P01–P08 remain production service/operational dependencies. Their frontend controls and demonstrations do not establish real server enforcement, external delivery, malware scanning or durable closed-browser execution. Formal WCAG assessment, representative load testing and authorised production sign-off remain required.
