# CareVerity Academy seeded workflow

This application is a frontend with seeded data. Academy behaviour follows CV-MDI-ACADEMY-01 and uses the existing workspace-scoped browser store, local media library, HR staff records and rota checks. The staff and management screens share the application's branding and design.

Academy screen density and typography follow `BRANDING-DESIGN-GUIDE.md`. Metric cards use the application-wide `brand-cards.css` contract through `cv-metric`, including top-right icon tiles, stacked labels/values/explanations and responsive sizes. These shared metrics also cover the question-bank, structure and publishing summaries and learner result views. Screen-specific workflow layouts, reference colors and existing calculations are retained.

## Walk through the module

1. Open Training Academy in the Admin Console. Create/save a draft course, then open Video & Resources. Upload or drop multiple videos, add PDF/DOCX resources, select which resources require read acknowledgement, and attach SRT/WebVTT captions. Draft captions can be created from an entered transcript and must be reviewed for timing and accuracy. Save & Continue opens the dedicated Modules & Lessons screen. Build the outline, add/edit lessons, drag or use the move actions to reorder them, and set module prerequisites, watch thresholds and document acknowledgement rules. Save Structure retains a draft without changing live assignments. Preview Learner Journey saves the draft before opening manager preview; Save & Continue opens question creation for the same course. Uploaded media passes simulated processing; a video requires explicit accessibility approval before publication.
2. Publish and assign from the Academy staff list or the existing worker's HR training tab. The assignment retains the exact course/question/policy snapshot. A refresher archives the earlier cycle without changing its results.
3. In Staff Portal > Training Academy, use My learning/My courses. Complete required watched content and resource acknowledgements, resume learning, and start the unlocked assessment.
4. Submit the assessment. Critical failures, weighted thresholds, attempt caps and retake waits follow the assigned policy. Permitted feedback appears after submission; ordinary workers do not receive internal-PDF download shortcuts.
5. A pass starts `AcademyDemoWorkflow`. It creates the PDF, calculates its checksum, files it in the exact worker's existing Training & Certificates category, upserts knowledge training/history, schedules renewal, and records compliance/rota refresh acknowledgements.
6. Inspect the evidence from the HR staff page or Certificates & Compliance. The worker sees the same result and workflow state in their training record; the main staff dashboard also shows training needing attention.

## Question bank and course schedule

Step four is the course question bank. Add, duplicate and reorder questions, mark the correct answer(s), set marks/critical rules and save the whole bank as drafts. Publish reviewed questions individually, then publish the approved course version. The question bank retains earlier published versions for existing assignments.

Use Question Groups & Course Schedule to create named quizzes or surveys, choose before/after a module, within a module after a selected lesson, after a lesson, scheduled or end-of-course placement, and set opening/due days after assignment. The left panel selects a named group, the central panel shows only that group’s questions and editor, and the right panel retains the course bank summary. The final course assessment has its own group. Group menus manage names, placement, grading and removal; the central Add Question action creates a question in the selected group. Group switching preserves unsaved edits without creating placeholder questions, and Previous/Next stays within that bank. Select questions and use Assign Selected to move them between groups. Free text questions belong only to surveys.

Set Count toward final grade per quiz independently of Require a pass before continuing. Required quizzes gate subsequent learning and the final assessment until passed; required surveys gate until submitted. A counted quiz must be submitted before the final assessment even when a separate pass is optional. Legacy groups default to quizzes excluded from the final grade. Each quiz has its own attempt history and retake allowance under the frozen course policy.

Overall course grade = earned marks / available marks across the final assessment plus counted quizzes. Practice-only groups and surveys are excluded. The latest submitted attempt from each counted quiz is fixed when the final attempt starts; each final result retains contributing attempt IDs and a marks breakdown. Critical failures in counted quizzes also prevent the overall pass. Assignments retain the published group settings and questions, so subsequent authoring does not rewrite existing learning.

Surveys support choice and free text responses without answer keys, critical conditions, marking or a timer. Required responses must be supplied. Survey submissions retain responses and completion status, display no percentage/pass/fail grade and are excluded from report score averages and pass rates. Learner groups appear at their configured location in the module sequence. The learner sees opening, due/overdue and retake states. Quiz and survey completion never issues a course certificate or updates HR training completion. Only a pass in the final course assessment starts that workflow.

## Rules and staff assignments

Step five opens Assessment Rules & Staff Assignments for the same course. Configure pass threshold, timer, attempt/retake policy and feedback. Choose canonical role/team targets or existing individual/HR staff records, set priority, due date, channels and refresher settings. Save Rules & Assignments stores a draft setup. Assign Training and Send Refresher open an exact-recipient review. Where a new approved course version is needed, publication and assignment commit together or roll back together. Existing cycles retain their frozen rules; a refresher archives the earlier cycle and starts a new one.

Assignment targeting metadata is excluded from learner course projections and content snapshots. App/platform notification requests are recorded locally; email requests remain explicitly unconfigured. The green post-pass flow describes configured actions, while each worker's evidence timeline continues to report the actual acknowledgements.

## Publishing

The final Publish step provides course readiness checks, approval/issuing details, effective-date availability, active status and version notes. Review checks use the same validation as publication and do not change stored records. Save a draft or preview the learner journey, then confirm the current review and publish. Changes to the reviewed inputs reset confirmation. Newly published versions retain their resolved policy and thresholds; old published content and its referenced media remain available in read-only version history. Future effective dates and inactive versions are not available for new assignments or optional enrolment. Publishing alone does not assign staff or issue completion evidence; continue to Staff Assignment Setup when ready.

## Demonstrate recovery

In Academy settings > Integrations, select a failure scenario and save. Pass the final course assessment, then inspect its evidence workflow. HR filing failure retains the true pass and generated artifact without claiming attachment. Restore Healthy workflow and select Retry saved workflow. The same certificate and document references are reused; already completed steps are retained.

The processor resumes queued work when the workspace is opened. Historic seeded certificates are reconciled from their matching passed attempts. Refresher notices are checked while the application is open. Document bytes remain staged only until HR filing acknowledges them, then the HR document is the retained copy.

## Shared data ownership

| Data | Owner and behaviour |
| --- | --- |
| Staff identity | Existing company/workspace and staff person IDs; no duplicate Academy person |
| Courses and attempts | Academy store; immutable assignment/rubric snapshots and retained history |
| Media | Workspace-keyed IndexedDB; format validation and simulated processing/readiness |
| Certificate workflow | `academy.completions`, correlation/result/assignment IDs, stage acknowledgements and retry count |
| PDF | Existing staff documents, Training & Certificates, exact document ID and checksum |
| Knowledge training | Existing HR training item, source completion ID, retained training history and course renewal date |
| Practical evidence | Existing assessor/competency and separate practical completion/review dates; online renewal does not extend them |
| Currency and rota | Read shared HR/Academy evidence; exclude pending or revoked evidence and preserve task-specific restrictions |
| Records access | Worker request and HR acknowledgement; acknowledgement does not claim disclosure or external delivery |

The official display name is CareVerity Academy. Existing module keys, URLs, staff/course IDs and historical certificate references are retained.

## Scope boundary

This is a seeded local demonstration, not a production security boundary or external regulatory certification. Browser record projections hide learner keys and internal certificate actions in the normal UI; the source store is still local. A future backend can replace the simulated processor using the same explicit workflow states and canonical record relationships.

## Course creation sequence

Create course opens Course Details, then Save & Continue advances through Video & Resources, Modules & Lessons, Questions, Rules & Assignments and Publish. A shared numbered navigation strip identifies the current stage. Later stages become accessible after the initial draft is saved.

All stages edit the same course ID. Back buttons save valid changes before returning, and returning to Questions resumes the existing bank instead of creating another question. An untouched initial blank question can be left without saving it. Invalid changes remain on their stage with an actionable error. Questions require explicit approval; publication and staff assignment remain explicit actions. Continuing to Publish only saves the rules and assignment plan.

## Unused uploads and module placement

Course-level uploads in Step 2 are retained in `pendingLessons`, separate from the actual lesson sequence. Each new video or PDF/DOCX resource remains unused until explicitly added to a module in Step 3. Existing placed lessons and their media retain their placement. Uploading through a specific lesson’s media editor attaches files to that lesson directly. Caption/transcript review works for pending videos as well as placed lessons.

The Course Structure panel lists unused uploads in red. Add to module opens lesson details with a required brief description, module, title, duration and mandatory flag; placement preserves file IDs, captions, transcript and document acknowledgement settings. Removing a placed media lesson returns its files to the unused list. Delete unused upload removes that course’s draft reference; it does not erase shared or historical files from the media library. Draft saves and Back remain available while arranging content.

Every unused video must be placed or deleted before continuing from Step 3. The step indicator disables subsequent steps; later authoring routes and course pickers redirect to structure when unused videos remain. Publication validation also rejects unused videos. Resources appear in the same unused list and can be placed or deleted, but only unused videos block Continue. Learner snapshots omit unused uploads; asset deletion protection still includes their draft references.

## Course media navigation

The standalone Video & Resources submenu and asset-library page have been removed. The old `/manage/learning/assets` URL redirects to Courses. Manage each course’s video/resources through its course creation and lesson media screens. Certificate signature/logo/background images can be uploaded directly in Academy Settings. Lesson descriptions are shown as tooltips on the lesson title, available on hover or keyboard focus, rather than as extra text below the title.

## Learner module and lesson plan

The learner course/lesson view follows Screen 7: course/learner identity and Previous/Next actions, a main lesson player or reading card, immediate resource rows and a green progress notice; the right column contains Course Progress, Lesson Outline, Quiz Unlock Conditions, Next Lesson and the blue course-record/evidence notice. Keep the normal Staff Portal shell and official CareVerity Academy name. Use the reference’s blue controls, purple resource/lock accents and green completion states, with shared Lato typography, 21px/14px headings, 12px/11px copy, compact spacing and application icon sizes.

Use native video controls and saved watch ranges, captions and transcripts. Reading lessons display the approved reading content in the same main card. Resource Opened state is recorded only after successful access; required read acknowledgement is a separate action. Mark as complete remains disabled until the configured lesson requirements are met. Progress counts, lesson lock/current/completed states, next-lesson availability, question-group placement, retake dates and evidence workflow status come from the stored assignment and course snapshot. Lesson completion alone does not claim HR filing or competency. Existing private notes and preview protections are retained. At mobile widths the two columns stack without horizontal overflow.

## Screen 8 quiz answering

The active attempt screen follows the quiz reference: course/attempt identity and Exit Assessment above the question card; question count, answered-progress bar, lettered choices, response guidance, Previous Question, Flag for Review and Save & Next within it; question navigator, live timer, assessment summary and rules to the right; and a green Submit Assessment bar below both columns. Accessibility controls remain in an expandable section below the submission bar. Surveys use the same arrangement with free text/choice responses and no grading or time limit.

Answer selection still saves immediately. Save & Next explicitly confirms saving the current response and advances only on success; the last question uses Save & Review. The navigator distinguishes answered/current/unanswered/flagged questions without showing correctness. Pass information uses the frozen threshold and available marks; a final attempt with counted quiz contributions states that the threshold applies to combined marks. Attempts, countdown, flags, exit/resume and final validation retain their existing scoped policies and ownership checks. Only submission marks responses; the completion bar does not claim HR filing or compliance before their workflow acknowledgements.

## Screen 9 selected staff results and retakes

Results & Retakes now opens an individual staff assessment from the staff selector, learner name or Result & Feedback link. The result URL is `/manage/learning/results/:attemptId`. The reference arrangement includes the staff/course/score/result/date/attempt card, feedback summary, Staff File/Training Record/Manage Retakes actions, eight recorded workflow steps, a workspace retake queue and the Retry Rules, Retake Policy and Integration Status panels. Tabs switch between the result/workflow, outstanding retakes and integration acknowledgement audit. Date filtering applies to the workspace retake queue without hiding the specifically selected record.

A selected completion workflow must match the exact result, assignment, worker and tenant. Green integration states require the corresponding acknowledgement. Failed results, surveys and checkpoint groups do not imply a course certificate; revoked evidence is explicit while historical results and acknowledgements are retained. Workflow retries reuse the existing result and certificate and resume from saved stages. Elapsed time and UK clock timestamps use recorded values. Score display is rounded to at most two decimals with the unrounded value available as a tooltip; the committed pass/fail decision is unchanged.

Managers can schedule a retake in UK local time using the frozen attempt limit and minimum gap. `retakePlans` retain source failed attempt, assignment, worker, group, planned instant, actor/timestamps, notification timestamp and the started attempt ID when consumed. A plan never resets attempts or changes the assignment’s course/questions. The later of the policy wait and scheduled instant gates starting the next attempt. Running, superseded, completed/archived or exhausted cycles cannot be scheduled. Quality reviewers remain read-only, and learners cannot open the administration view.

Scheduling records an in-platform learner notice when enabled. Notify Learner uses the same canonical assignment and deduplicates identical notices. The portal notice opens the course so the learner can start/resume an eligible retake; it does not claim external email delivery. Exhausted attempts remain visible for manager review.

### Screen 10: selected staff certificates and compliance

`/manage/learning/certificates/:certificateId` opens the staff-specific reference layout. The register’s staff selector chooses that worker’s latest issue; the detail selector switches only between that worker’s certificates. The reporting period applies to selected-staff summary totals, while the selected certificate remains visible. Issuance and synchronisation counts describe recorded events, including historical issues; they do not claim present validity.

The HR attachment, training record and six timeline stages resolve against the exact workspace, person, assignment and passed attempt. For older certificate records without `passedAttemptId`, a matching certificate-generation acknowledgement and canonical passed attempt are required. Current course status also requires the actual current HR training record, filed PDF, completed workflow and unexpired/unrevoked evidence. Historical acknowledgements remain visible after expiry, supersession or revocation. Refresher completion requires an actual active schedule; no-expiry policy displays a non-applicable schedule stage.

Visit rows use existing upcoming staff allocations and `RotaService.conflicts`, with explainable restrictions. They are hidden from roles without rota-view access. An acknowledged rota refresh means training inputs were refreshed; it does not grant blanket deployment eligibility. Mandatory knowledge and separate practical checks remain visible.

The matrix and integration/access audit expand on the staff page. Certificate preview and filed-PDF accesses use the workspace-checked `recordCertificateAccess` operation, including read-only evidence reviewers, without granting course-management rights. No learner certificate-PDF access is added. Revocation retains source evidence and history; workflow retry reuses its existing job and certificate. These remain seeded frontend records and local processing, with production durability and server authorisation covered by the existing integration handoff.

## Full frontend demonstration: policies, review and recovery

Administrator entry to CareVerity Academy initialises governance examples once per workspace. Existing saved governance records are preserved. Open **Policies & reviews** (`/manage/learning/governance`) for Reviews, Requirements & renewals, Adjustments & feedback, Task authorisations, Notifications, Access controls, Records disclosure, Recovery & data and KPI definitions. The page also creates real small PDF/WebVTT files in the local media store when missing.

The seeded course **Advanced Care Practice — Demonstration** contains four modules, eight reading lessons, a prerequisite course, ten grouped quiz/survey/final questions and delayed feedback. The seeded exhausted-attempt case links to an actual failed fixture attempt and retained original cycle. Other examples show approved reading-time adjustment, all four delivery states, a restricted observed task, a scoped access window, a portable-record request and a future requirement policy. Fictional provider content and approvals are demonstration data.

Suggested walkthrough:

1. Review the exhausted-attempt case, enter actions and a resolution decision, and retain the original result. A fresh learning cycle is a separate explicit assignment; review resolution does not reset attempts.
2. Approve extra time or an untimed adjustment for an unfinished assignment. Start the learner attempt and inspect its frozen adjustment. Change the approval and verify the running attempt stays unchanged. Release manager-controlled feedback only through an authorised review action.
3. End-date an effective requirement and create a prospective successor. Enable automatic assignment, run the scheduler and repeat it; active cycles/notices are deduplicated. New assignments freeze the resolved renewal interval. App-open scheduling is local; no closed-browser scheduler is claimed.
4. Process a queued notification to Sent and then Delivered. Toggle a simulated channel outage to create Failed, inspect its history and retry. All provider IDs are local-demo references; no email/SMS is sent.
5. Record observed task evidence, assessor, review date, service-user/location scope and restrictions. Rota still evaluates all employment, availability, training and practical checks; a quiz does not confer task authority.
6. Approve a time-limited staff-scoped reviewer grant. Expired/revoked grants deny access. For technical support grant Diagnostics only and open `/manage/learning/diagnostics`; it provides job IDs/states and no worker names or document content.
7. Approve a training-record request, then record provision with the secure case reference. Closed outcomes cannot be silently changed back to acknowledged. External delivery remains the organisation's approved process.
8. Correct an issued certificate with a reason. The original is revoked/linked; the new workflow uses the original passed attempt and a new certificate/document, retaining the historical PDF. Invalidation retains marks, blocks current evidence and is explicit in results/reports.
9. Export inspection evidence and verify no answer-key snapshots/private notes/PDF bytes are included. Use the separate private demo backup only for controlled local restoration; media blobs remain in IndexedDB.
10. Simulate offline operation, save learner actions, then reconnect to mark the local operation queue reconciled. Run evidence reconciliation after restoration; missing certificate/workflow/HR links resume under the same certificate reference. This does not represent server acknowledgement.

Asset processing/rejection and notification delivery are labelled simulations. Production authorisation, server-only keys, malware scanning/transcoding, encrypted central storage, background delivery, durable jobs and operational acceptance remain server/infrastructure work. Approved clinical/qualification policies and legal issuer details must replace demonstration configuration before live use.
