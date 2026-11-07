# CareVerity Academy frontend implementation checklist

Scope confirmed by the product owner: this is a frontend with seeded data. CV-MDI-ACADEMY-01 v1.0 defines the expected workflows. Integration steps are demonstrated against the application's shared browser records; no live backend is required for this scope. Screens use the existing CareVerity application branding and compact component design.

## Navigation and staff portal
- [x] Keep the standard Admin Console and Staff Portal shells, workspace selection and application palette.
- [x] Group Academy destinations in expandable Training Academy menus, including keyboard collapse, deep-link expansion and selected page state.
- [x] Show an own-record training summary on the main staff dashboard.
- [x] Provide My learning, My courses, Assessments, Training record, Required refreshers and Training messages.
- [x] Retain historical initial/refresher cycles and original results after a new assignment.
- [x] Ignore forged learner person-query contexts; restrict course content to own assignments and approved optional enrolment.
- [x] Keep personal learner notes out of another worker's administrator preview.

## Course authoring and learner journey
- [x] Capture course code, outcomes, audience, owner, issuer, rights, approval/effective date, validity and separate practical requirements.
- [x] Freeze course, question, pass threshold, sequencing, shuffle, timer and retake policy per assignment.
- [x] Keep published content stable during draft edits and preserve older assignment media references.
- [x] Support ordered module-labelled lessons, prerequisite checks, consistent counts/time, reading, policy acknowledgement, video and assessment access.
- [x] Validate local upload formats, show simulated media processing and require caption/transcript review before video publication.
- [x] Offer captions, transcript, resume, previous/next lesson controls, required resources and explicit read acknowledgements.
- [x] Track merged watched video ranges; seeking and replaying the same range do not manufacture watch completion.
- [x] Enforce content gates, weighted pass thresholds, critical questions, attempt limits, waiting periods and duplicate-submit protection.
- [x] Withhold answer keys and explanations from learner attempt projections until permitted feedback release.
- [x] Present retake eligibility, exhaustion/manager review and the assigned feedback policy accurately.

## Seeded completion automation
- [x] Start/resume the persisted completion workflow from the application shells.
- [x] Generate a branded internal certificate PDF with course version, staff metadata, issuer, result, serial and review date.
- [x] Compute a SHA-256 checksum and file the PDF once in the exact existing worker's Training & Certificates category.
- [x] Retain pending artifact bytes until filing succeeds; retain only the HR copy after acknowledgement.
- [x] Update the same worker's HR training item and preserve training history and separate practical review dates.
- [x] Create a course-specific refresher schedule and in-app reminder from the saved renewal date.
- [x] Recompute knowledge training currency from applicable mandatory requirements, current accepted evidence and revocation state.
- [x] Refresh rota training inputs without assigning visits or granting practical authority.
- [x] Display certificate, HR, training/matrix, compliance and rota acknowledgements independently.
- [x] Provide configurable HR/training/compliance/rota outage scenarios and recoverable retries without duplicate artifacts or links.
- [x] Reconcile historic seeded passed attempts into the same workflow while preserving original references.
- [x] Preserve pass results and file history on revocation while excluding revoked evidence from current currency and rota checks.

## HR access and evidence views
- [x] Show Academy assignments on the existing HR staff training tab; assign/send a refresher with that exact worker selected.
- [x] Let authorised HR/managers inspect the completion timeline, document reference, checksum and filed PDF.
- [x] Keep ordinary worker internal-PDF shortcuts unavailable, including the HR document-list projection.
- [x] Allow a worker to record a training-record access request, with HR acknowledgement and no false disclosure/delivery claims.
- [x] Keep knowledge compliance, observed practical competency and visit-specific deployment readiness separate.
- [x] Provide read-only evidence access for quality/compliance reviewers while keeping authoring, revocation and retry restricted to managers.

## Verification
- [x] Test the learner pass/history/refresher journey, own-record isolation, records requests, private notes and assessment policies.
- [x] Test exact-person filing, duplicate/replayed processing, HR outage recovery, practical-date preservation and actual PDF generation.
- [x] Pass the combined Academy/staff portal/HR/rota regression run: 152 tests across 19 files.
- [x] Pass the final production build and 50 focused Academy/portal permission, navigation and workflow checks across 5 files after the reviewer-access refinement.
- [ ] Complete desktop/mobile visual inspection. The review tool currently exposes no browsers; visual approval remains unverified.

The seeded implementation demonstrates the MDI journey. Real authentication, server-only answer keys, encrypted server storage, malware/transcoding services and durable server event processing would belong to a future production implementation, rather than this frontend scope.

Final verification: production build passed with existing PDF dependency optimisation warnings; `git diff --check` passed. No deployment or source-control push was performed.

## Dashboard reference alignment

- [x] Reproduce the supplied dashboard's nine-step automated workflow, connecting arrows, seven KPI cards and the Course Activity / Expiring Courses & Refreshers / Recent Completions / Integration Health / Compliance & Workforce Readiness arrangement.
- [x] Restore the reference's blue, purple, green and amber icon colors, tinted metric panels, blue table headers, green status pills and compliance donut.
- [x] Keep the standard application shell and Training Academy dropdown; retain approved application spacing, typography and icon sizing.
- [x] Keep all figures and health badges backed by the seeded records, with a working reporting-period selector and pending/exception states.
- [x] Pass the production build and all 12 rendered page/navigation checks after the reference update.
- [ ] Compare desktop/mobile rendering visually; no browser surfaces are available to the review tool in this session.

## Course creation reference alignment

- [x] Match the supplied course creation layout: course details, role applicability, compliance tags, renewal rules, publishing switches, numbered learning outcomes and the right-hand course summary.
- [x] Use the reference's blue section icons, selected chips, mandatory/optional tiles, green switches and status panel, and five post-pass update rows.
- [x] Retain application spacing, typography and icon sizes, with responsive stacked layouts for smaller screens.
- [x] Keep course duration, roles, tags, renewal interval, pass mark and practical sign-off connected to the live summary and saved draft.
- [x] Preserve MDI approval fields and assessment links below the course profile; provide resources and module/lesson authoring through the dedicated second and third course-creation steps.
- [x] Create new courses as drafts; preserve draft status when publication validation fails and prevent new assignments to inactive courses.
- [x] Pass the production build and all 41 course page/service tests, including creation, publication validation and inactive-course assignment checks.
- [ ] Verify desktop/mobile rendering visually in a browser; visual comparison remains unverified.

## Video and resource upload reference alignment

- [x] Reproduce the supplied upload layout: course steps, video drop zone and queue, supporting resource table, processing timeline, subtitle warning, accessibility panel and footer actions. The authoring strip now links Rules & Assignments to the final sixth Publish step.
- [x] Retain the reference's blue workflow and table headers, purple upload button, green completion states, amber subtitle warning, PDF/DOCX pills and mandatory-resource switches.
- [x] Use application spacing, typography and icon sizes, preserve the shared shell, and stack the panels on smaller screens.
- [x] Link the saved course profile to the course-level upload step, preserve lesson-specific links and save placement before continuing to Modules & Lessons.
- [x] Support multiple videos, drag and drop, individual upload errors, preview selection and removal without deleting shared media.
- [x] Support PDF/DOCX resources and per-resource mandatory read acknowledgements; optional resources remain available without blocking lesson completion.
- [x] Accept SRT/WebVTT subtitles and generate reviewable draft WebVTT captions from an entered transcript; require saved captions and transcript for accessibility approval.
- [x] Keep browser processing explicitly simulated and display readiness from the saved media state.
- [x] Pass the production build and all 43 focused course page/service tests, including multiple uploads, partial failures, resource switches, SRT conversion, caption generation/approval and step continuation. `git diff --check` passes.
- [ ] Verify desktop/mobile rendering visually in a browser; no browser surfaces are available in this session.

## Modules and lessons reference alignment

- [x] Implement step three as a dedicated Modules & Lessons screen with the reference's course banner, left course outline, expandable central lesson tables and right structure summary.
- [x] Retain blue folder/video icons, purple reading icons, numbered lesson pills, mandatory badges, green readiness states and the reference's panel colors; use application spacing, fonts and icon sizes.
- [x] Add and rename modules; add, edit, move and remove lessons; preserve resource, video and assessment-question links.
- [x] Support drag reordering and keyboard-accessible move actions; prevent moves/removals that break prerequisites or question links.
- [x] Persist module identities, lesson membership, module prerequisites, watch thresholds, mandatory-resource acknowledgement and sequential completion policy.
- [x] Enforce module prerequisites in the assigned learner snapshot, including when sequential completion is disabled.
- [x] Keep final assessment authoring separate from learning lessons and show actual question counts, lesson counts and estimated durations.
- [x] Save structure changes as a draft, preserve published courses and existing assignment snapshots, and save before learner preview or continuation to questions.
- [x] Pass the production build and all 50 focused course page/service/navigation tests, including structure creation/persistence, lesson reordering, module completion rules, learner prerequisite enforcement, publication validation and the shared Academy menu selection. `git diff --check` passes.
- [ ] Verify desktop/mobile rendering visually in a browser; visual comparison remains unverified.

## Question bank reference alignment and assessment scheduling

- [x] Reproduce step four's course selector, five-step authoring strip, question list, central question editor, answer-option rows, green correct-answer treatment, critical-question switch, marks, feedback, version history and right question-bank summary.
- [x] Keep the reference's purple Add Question action, blue save/navigation controls, green selected-question panels and summary icon colors; use application typography, spacing and icon sizes.
- [x] Preserve edits when switching questions; add/duplicate/reorder questions and save the bank atomically with stale-edit checks and retained published versions.
- [x] Preserve defined marking for single-answer/multiple-answer MCQs and true/false. Short answer and matching remain unused summary categories; no undefined automatic marking is introduced.
- [x] Configure named question groups and bulk-assign selected questions; support before/after-module, after-lesson, scheduled and end-of-learning checkpoints.
- [x] Set opening and due days relative to assignment, display available/overdue/retake states, and freeze group membership, placement and policy in assigned course/question snapshots.
- [x] Gate later learning on required checkpoint passes; keep attempt limits, retake waits, answer snapshots, marks, critical rules and feedback release scoped to each assessment group.
- [x] Record checkpoint passes without completing the course or issuing certificates, CPD, HR evidence or compliance updates. Require the final course assessment for that workflow.
- [x] Keep checkpoint results identified separately in learner history, manager results and course completion views; preserve question-group references during structure edits.
- [x] Pass the production build and all 61 Academy page, service, navigation and completion-workflow tests, including bank rollback/stale checks, bulk grouping, before/after-module checkpoints, after-lesson learner actions, frozen schedules, attempt limits and final-only certification. `git diff --check` passes.
- [ ] Complete desktop/mobile visual comparison in a browser; no browser surfaces are available in this session.

## Assessment rules and staff assignments reference alignment

- [x] Implement step five with the reference's five-stage authoring strip and three columns: assessment rules, staff targeting/current assignments and the automated post-pass flow.
- [x] Match blue controls and icons, green switches and workflow cards, purple certificate/refresher accents, staff avatars, source icons and assignment status pills; retain application spacing, typography and icon sizes.
- [x] Connect pass mark, timed/untimed assessment, attempt limit, retake wait, feedback and sequential completion to the course policy. Critical rules come from approved questions; mandatory post-pass actions stay enabled.
- [x] Support canonical role/team targeting, individual workers and exact-worker HR profile links, with priority, due date, notification channels and refresher cycle settings.
- [x] Save rules and targeting setup as a draft; review exact recipients, rule values and the approved question bank before applying assignments.
- [x] Publish an approved course and assign it atomically when needed; roll back publication and assignments together on failure, and reject stale course/question-bank or changed recipient reviews.
- [x] Retain earlier assignment snapshots and history; a refresher creates a new cycle while ordinary re-assignment updates deadlines without rewriting completed learning.
- [x] Record notification requests accurately: app/platform requests are local records and email is unconfigured. Preserve actual assignment source, priority and request states.
- [x] Keep targeting setup out of learner course projections and assignment content snapshots.
- [x] Pass the production build and all 68 Academy page, service, navigation and completion-workflow tests, including reviewed rule publication, canonical role/team/HR targeting, refresher history, notification request states, privacy, stale-version rejection and atomic rollback. `git diff --check` passes.
- [ ] Complete desktop/mobile visual comparison in a browser; no browser surfaces are available in this session.

## Publishing page

- [x] Add a dedicated final publishing page, linked from course editing, rules/assignments and the shared Training Academy menu.
- [x] Use the established blue controls, green readiness/publication panels, purple approval accents and application spacing, typography and icon sizes.
- [x] Show course/lesson/question totals, actionable readiness checks, approval fields, effective date, active status, version notes, learner preview and a publication summary.
- [x] Run publication checks through the existing publish validation without changing saved drafts, assignments, history or audit events.
- [x] Require a fresh review confirmation; reset it when course details, published questions, media readiness, settings or the saved course revision change.
- [x] Preserve existing learner snapshots; freeze inherited assessment rules and renewal/pass thresholds in newly published versions.
- [x] Retain read-only published course snapshots, publication actor/time, approval details and version notes; protect their referenced media from deletion.
- [x] Describe future availability and inactive publication accurately; existing assignment and optional-enrolment gates prevent early/inactive access.
- [x] Pass the production build and all 75 Academy page, service, navigation and completion-workflow tests, including publication preflight, approval resets, stale drafts, retained versions/media, frozen policies and future/inactive availability. `git diff --check` passes.
- [ ] Complete desktop/mobile visual comparison in a browser; no browser surfaces are available in this session.

## Application branding, typography and metric cards

- [x] Apply `BRANDING-DESIGN-GUIDE.md` sections 4, 6, 8, 13 and 15 across Academy administration, authoring, assignment, evidence, publishing, learner and assessment screens, including retained catalogue/progress/CPD views.
- [x] Adopt the shared application page marker and content gutter, Lato, 21px page headings, 14px section headings, 12px record/control text and 11px supporting copy; retain 10px table headings/footers and the learner's explicit larger-text option.
- [x] Reuse `shared/brand-cards.css` through `cv-metric`: one direct icon child followed by one text column, label/value/explanation order, top-right solid category tile and shared responsive dimensions. Remove superseded Academy card sizing and absolute icon positioning.
- [x] Apply shared metrics to dashboard totals, staff/register/report totals, staff dashboard training summary, question-bank/structure/publishing totals and learner assessment results. Preserve all existing calculations and destinations.
- [x] Use guide card padding and 20px values, approved tone surfaces, 10px/8px metric row/column gaps, natural card heights, and the two-column mobile layout with an odd final card spanning the row.
- [x] Normalize section/column spacing, neutral panel density, 44px form/action controls and effective 12px table records; allow long content and tables to wrap or scroll.
- [x] Pass the final production build, `git diff --check` and all 89 learning and Staff Portal regression checks across 9 files. No business calculations, assessment rules or stored records are changed by this visual migration.
- [ ] Compare rendered Academy pages with Companies at the guide's viewport sizes and zoom levels; the browser tool exposes no browsers in this session.

## Sequential course creation

- [x] Open Create Course at Course Details and show the same six numbered stages across all authoring pages.
- [x] Save and continue through Course Details → Video & Resources → Modules & Lessons → Questions → Rules & Assignments → Publish using one course ID.
- [x] Save valid edits on Back, block invalid Next actions and resume the existing question bank without adding duplicate blank questions.
- [x] Keep question approval, course publication and staff assignment explicit; saving the assignment plan does not assign staff.
- [x] Verify the complete routed journey from Create Course to an approved published course, including required-field validation, Back/resume and no duplicate questions or unintended assignments.
- [x] Pass the production build, whitespace checks and all 90 learning and Staff Portal regression checks across 9 files.

## Module quizzes, surveys and grading groups

- [x] Show selectable named groups with counts on the left, the selected bank’s questions and editor in the centre, and the course bank summary on the right. Include a separate final assessment group, group menus, bulk assignment and ordering within a group.
- [x] Configure quiz/survey purpose independently of completion gates. Quizzes can count toward the final grade or remain practice only; surveys never contribute marks.
- [x] Place groups before/after a chosen module, within a module after a selected lesson, after a lesson, by schedule or at course completion. Render learner checkpoints at those positions in the lesson sequence.
- [x] Support choice and free text survey responses without answer keys, critical pass conditions or a timer. Require required responses and record completion without a score or certificate.
- [x] Combine counted quizzes and the final assessment using earned marks / available marks. Freeze contributing quiz attempt IDs at final attempt start and preserve a result breakdown.
- [x] Apply critical failures from counted quizzes to the overall pass decision and require counted quizzes to be submitted before final assessment. Preserve optional-pass and required-pass distinctions.
- [x] Preserve published assignment snapshots and legacy practice-only group behaviour; reject invalid within-module targets, graded surveys and free text outside survey groups.
- [x] Exclude surveys from report score averages and pass rates. Show grading settings in Modules & Lessons and publication review.
- [x] Pass the production build, whitespace checks and all 94 Academy/Staff Portal regression checks across 9 files, including survey authoring/submission, module placement, counted marks, critical failures and frozen grading contributions.

## Selected question bank layout

- [x] Use the module-builder arrangement: named group selectors and group menus on the left, only the selected bank’s questions and editor in the centre, and the full course bank summary on the right.
- [x] Preserve question edits while switching groups, show an empty-bank state without creating a blank question, add questions into the selected bank, and scope Previous/Next to that bank.
- [x] Keep bulk assignment inside the central bank and remove the duplicate group cards below the workspace.
- [x] Pass the production build, whitespace checks and all 94 Academy/Staff Portal regression checks, including selecting an empty survey bank, adding its question and preserving edits while switching to the final assessment and back.
- [ ] Complete visual browser comparison; the seeded browser account reaches Access restricted for Academy authoring.

## Unused upload placement

- [x] Keep new course-level video and resource uploads separate from placed lessons; preserve existing lesson media and allow pending caption/transcript review.
- [x] Show red unused-upload rows inside Course Structure, with Add to module and Delete from course actions. Require a brief description when creating the lesson and preserve uploaded media and document settings.
- [x] Return removed media lessons to the unused list. Retain shared/historical media when deleting the course’s pending reference.
- [x] Block Continue, later-step links, authoring routes/course selection and publication until every unused video is placed in a module or deleted. Keep draft saves and Back available.
- [x] Protect unused assets from library deletion and keep unused uploads out of learner snapshots and learning-time totals.
- [x] Pass the production build, whitespace checks and all 95 Academy/Staff Portal regression checks, including the complete upload → module placement → question builder journey, unused-video deletion and route gating, removed-lesson recovery, pending-media review and snapshot protection.

## Course-owned media and lesson tooltips

- [x] Remove the standalone Video & Resources submenu entry, catalogue page, upload/preview actions and internal links; redirect old library URLs to Courses. Retain course-specific media uploads and review.
- [x] Keep certificate image uploads in Academy Settings without a separate library page.
- [x] Replace descriptions beneath lesson titles with accessible hover/focus tooltips, preserving the description in the lesson editor.
- [x] Pass the production build, whitespace checks and all 95 Academy/Staff Portal regression checks, including removal of the library navigation/page, redirecting its old URL and providing lesson descriptions through tooltips.

## Screen 7 learner module/lesson reference

- [x] Match the supplied Screen 7 card arrangement and blue/green/purple visual language within the shared Staff Portal shell, using CareVerity Academy naming and the branding guide’s spacing, Lato, font sizes and icon dimensions.
- [x] Provide the video/reading lesson card, caption/transcript controls, immediate required/optional resource rows, green learning notice, Course Progress, Lesson Outline, Quiz Unlock Conditions, Next Lesson and the blue course-record/evidence notice.
- [x] Preserve watched-range thresholds, explicit resource opening/read acknowledgement, sequential/module/question-group gates, privacy of notes, learner ownership, preview protections and exact evidence status.
- [x] Verify the reading journey with two required resources: opening alone does not complete the lesson, acknowledgements enable completion, progress updates and the next lesson/final assessment unlock at the correct points, and no certificate is created for lesson completion.
- [x] Pass all 96 Academy/Staff Portal regression checks across 9 files.
- [x] Inspect desktop and mobile browser previews: two columns at 1600px, one column at 390px, no horizontal overflow, Lato with 21px page/14px card headings.
- [x] Pass the final production build and whitespace checks after desktop/mobile colour verification.

## Screen 8 quiz answering reference

- [x] Match the supplied active-quiz card arrangement, blue controls/progress, purple identity/flags/icons, green answered states and full-width green submission bar, with the shared Staff Portal shell and branding-guide density and type sizes.
- [x] Include lettered answer rows, navigator state legend, live countdown, frozen assessment summary, rules, Previous Question, Flag for Review, Save & Next and final Save & Review; retain accessible larger-text/high-contrast controls.
- [x] Preserve single/multiple-choice, true/false, survey free text, answer-key redaction, automatic response saving, ownership, scoped attempt limits, expiry, exit/resume and final submission validation.
- [x] Advance Save & Next only after successful saving; retain the current question when saving fails. Display weighted/combined grading rules accurately.
- [x] Pass all 97 Academy/Staff Portal regression checks, including save failure, multiple selection, flags, exit/resume, incomplete-required-answer rejection and final grading.
- [x] Inspect isolated desktop/mobile quiz previews with answered/current/flagged navigation states: 1600px uses two columns, 390px stacks the cards without horizontal overflow, and Lato/21px/14px typography matches the guide.
- [x] Pass the final production build, whitespace checks and all 28 page interaction checks after the visual refinements; the full 97-check Academy/Staff Portal suite also passes.

## Screen 9 selected staff results and retakes

- [x] Open a selected staff result from the result register and staff selector, using the canonical staff/assignment/result IDs and keeping the shared Admin Console shell.
- [x] Match the reference’s identity/score/feedback card, eight-stage post-pass workflow, retake queue, three functional tabs and Retry Rules/Retake Policy/Integration Status side panels, using the branding guide’s spacing and type/icon sizes.
- [x] Show green stages only for exact recorded acknowledgements; retain visible exceptions/retries, absent evidence, checkpoint/survey distinctions and revoked evidence without claiming current compliance from a historical pass.
- [x] Schedule retakes against the frozen group/course policy, preserve question snapshots and attempt limits, enforce the later policy/scheduled instant, consume plans on actual start and deduplicate portal notices.
- [x] Keep quality reviewers read-only and deny administration access to learners; preserve workspace checks and block running, superseded, completed or exhausted retake scheduling.
- [x] Pass all 102 Academy/Staff Portal regression checks across 10 files, including exact-worker workflow recovery, certificate reuse, notice deduplication, scheduling boundaries, exhausted attempts and revoked evidence.
- [x] Inspect selected-staff results at 1600px and 390px: preserve the reference card arrangement, Lato/21px heading, semantic icon colours, stacked mobile cards and contained horizontal table scrolling without page overflow. Save desktop/mobile previews under `output/playwright/academy-staff-results-*.png`.
- [x] Pass the final production build, whitespace checks and all 102 regression checks after the desktop/mobile refinements.

## Screen 10 selected staff certificates and compliance

- [x] Open the selected staff member’s latest certificate from the evidence register and staff selector; switch between that worker’s issued certificates without changing staff identity or workspace.
- [x] Follow the reference’s four summary cards, gold-bordered certificate preview, HR attachment, course completion, matrix, visit-suitability and six-stage integration timeline, within the shared Admin Console shell. Apply branding-guide metric geometry, Lato, compact spacing and font/icon sizes.
- [x] Resolve exact certificate/workflow/person/assignment records; support older issued certificates only through a matching generated-certificate acknowledgement and verified passed attempt. Keep missing attachments, pending updates, exceptions, historical/superseded records, expired and revoked evidence explicit.
- [x] Filter selected-staff summary totals by reporting period; retain the selected certificate outside that period. Use actual renewal schedules and recorded acknowledgements without invented counts or trend percentages.
- [x] Show actual upcoming assigned visits and the existing rota conflict checks to authorised rota viewers. Keep knowledge currency, practical competency and visit suitability separate; do not infer blanket rota eligibility from a course pass.
- [x] Provide exact HR file and training-record links, staff matrix expansion, certificate acknowledgement/access audit, protected filed-PDF access, controlled revocation and idempotent workflow retry. Audit certificate preview/PDF access for authorised administrators and read-only evidence reviewers.
- [x] Inspect 1600px desktop and 390px mobile previews: four desktop summary cards, stacked mobile panels, Lato/21px heading, contained table scrolling and no horizontal page overflow. Save previews under `output/playwright/academy-staff-compliance-*.png`.
- [x] Pass the production build, whitespace checks and all 105 Academy/Staff Portal regression checks across 11 files, including staff-specific selection, workflow recovery without duplicate PDFs, legacy evidence references, access audit/permissions, workspace isolation, expiry and revocation.

## Full seeded MDI workflow completion — 6 November 2026

- [x] Use CareVerity Academy in administration/Staff Portal menus, company module displays and permission headings; retain the existing module keys, routes and historic identifiers.
- [x] Add branch audiences, course prerequisites/cycle validation, evidence type, renewal-policy reference and CPD justification; provide a seeded four-module/eight-lesson course with graded checkpoint, survey and final assessment examples.
- [x] Add individual approved assessment adjustments and immediate/delayed/manager-release feedback, frozen at attempt start; keep learner projections and completion gates consistent.
- [x] Add Policies & Reviews with source-linked exhausted-attempt reviews, reviewer/actions/decision, result invalidation and linked certificate replacement without manufacturing another assessment pass.
- [x] Add effective-dated requirement policies, minimum versions, accepted evidence/review settings, branch/service scopes, renewal intervals, deduplicated refresher scheduling and staged reminders. Freeze renewal intervals on new assignments.
- [x] Connect custom Academy courses and shared mandatory evidence rules to HR readiness and rota requirement selection; add separately observed task authorisations with location/service-user scope and restrictions.
- [x] Add a local delivery ledger with queued/sent/delivered/failed states, attempt history, simulated outages, retries and clear local-only provider references.
- [x] Add separate role capabilities, time-limited/scoped access grants, revocation/expiry checks and a restricted diagnostics view that excludes staff names, question content and PDF files.
- [x] Add disclosure approval, declined/provided outcomes and secure case references, preserving the ordinary worker PDF restriction.
- [x] Add local asset SHA-256, rights/language/version metadata, caption language, accessibility review records, actual seeded PDF/VTT files, version links and simulated scan rejection/retry controls.
- [x] Include configured branding/signature assets in automatic PDFs, preserve template version/correction chains and provide the canonical filed-PDF preview/access audit across Academy and HR document paths.
- [x] Redact inspection exports through explicit projections; exclude answer keys, responses, private learner notes and staged PDF bytes. Separate final/course and checkpoint reporting and add a shared Academy projection in Rich KPI.
- [x] Add private demo backup/restore, missing-evidence-link recovery, all-pass reconciliation and local offline-operation/reconnect records. Keep production delivery, security and durable background services explicit integration boundaries.
- [x] Link HR assignment evidence to the exact certificate. Initialise demo governance records on administrator entry to Academy without resetting existing saved governance records.
- [x] Pass 239 regression checks across 24 files covering Academy, Staff Portal, HR, rota, Rich KPI, company modules/creation and user permissions. After the final seed correction, pass all 15 focused governance/seed checks again. Pass the final production build and whitespace checks.
- [x] Inspect the new workspace at 1600px and 390px: Lato, 21px heading, responsive panels and contained table scrolling with no horizontal page overflow or runtime alerts. Keep previews in `output/playwright/academy-governance-{desktop,mobile}.png`. Clear the isolated verification browser records/media afterwards.
