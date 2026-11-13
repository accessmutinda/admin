"""Generate the admin company access DTOs from the backend OpenAPI contract."""

import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
contract = root.parent / "backend/docs-api/companies.openapi.json"
schemas = json.loads(contract.read_text())["components"]["schemas"]
names = [
    "ModuleConfiguration",
    "ModuleConfigurationChange",
    "CompanyAccessContext",
    "CompanyRoleCreate",
    "CompanyRolePermissions",
    "CompanyRole",
    "CompanyRoles",
]


def render(schema):
    if "$ref" in schema:
        result = schema["$ref"].split("/")[-1]
    elif "enum" in schema:
        result = " | ".join(json.dumps(value) for value in schema["enum"])
    elif schema.get("type") == "array":
        result = "(" + render(schema["items"]) + ")[]"
    elif schema.get("type") == "object" and "additionalProperties" in schema and not schema.get("properties"):
        extra = schema["additionalProperties"]
        result = "Record<string, " + (render(extra) if isinstance(extra, dict) else "unknown") + ">"
    elif schema.get("type") == "object" or "properties" in schema:
        required = schema.get("required", [])
        result = (
            "{\n"
            + "\n".join(
                "  "
                + json.dumps(key)
                + ("" if key in required else "?")
                + ": "
                + render(value)
                + ";"
                for key, value in schema.get("properties", {}).items()
            )
            + "\n}"
        )
    else:
        result = {
            "string": "string",
            "integer": "number",
            "number": "number",
            "boolean": "boolean",
        }.get(schema.get("type"), "unknown")
    return result + (" | null" if schema.get("nullable") else "")


output = "// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n"
output += (
    "\n\n".join(
        "export type " + name + " = " + render(schemas[name]) + ";" for name in names
    )
    + "\n"
)
target = root / "src/app/core/access/company-access.generated.ts"
target.write_text(output)
subprocess.run(
    ["npx", "prettier", "--write", str(target)],
    cwd=root,
    check=True,
    capture_output=True,
)

workforce_names = ["WorkforceStaff", "WorkforceSummary", "WorkforcePage"]
workforce_output = "// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n"
workforce_output += "\n\n".join("export type " + name + " = " + render(schemas[name]) + ";" for name in workforce_names) + "\n"
workforce_target = root / "src/app/features/management/people/workforce.generated.ts"
workforce_target.write_text(workforce_output)
subprocess.run(["npx", "prettier", "--write", str(workforce_target)], cwd=root, check=True, capture_output=True)

recruitment_names = [name for name in schemas if name.startswith('Recruitment')]
recruitment_output = '// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n'
recruitment_output += '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in recruitment_names)+'\n'
recruitment_target=root/'src/app/features/management/recruitment/recruitment.generated.ts'
recruitment_target.write_text(recruitment_output)
subprocess.run(['npx','prettier','--write',str(recruitment_target)],cwd=root,check=True,capture_output=True)


onboarding_names = [name for name in schemas if name.startswith('Onboarding') or name == 'StaffOnboarding']
onboarding_output = '// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n'
onboarding_output += '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in onboarding_names)+'\n'
onboarding_target=root/'src/app/features/management/people/onboarding.generated.ts'
onboarding_target.write_text(onboarding_output)
subprocess.run(['npx','prettier','--write',str(onboarding_target)],cwd=root,check=True,capture_output=True)

compliance_target = root / 'src/app/features/management/people/workforce-compliance.generated.ts'
compliance_target.write_text('// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\nexport type WorkforceCompliancePage = ' + render(schemas['WorkforceCompliancePage']) + ';\n')
subprocess.run(['npx','prettier','--write',str(compliance_target)],cwd=root,check=True,capture_output=True)

leave_names = [name for name in schemas if name.startswith('WorkforceLeave') or name.startswith('WorkforceAvailability') or name == 'WorkforceCalendar']
leave_target = root / 'src/app/features/management/people/availability-leave.generated.ts'
leave_target.write_text('// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in leave_names)+'\n')
subprocess.run(['npx','prettier','--write',str(leave_target)],cwd=root,check=True,capture_output=True)

review_names = [name for name in schemas if name.startswith('StaffReview')]
review_target = root / 'src/app/features/management/people/staff-reviews.generated.ts'
review_target.write_text('// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n'+'\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in review_names)+'\n')
subprocess.run(['npx','prettier','--write',str(review_target)],cwd=root,check=True,capture_output=True)

service_user_names = [name for name in schemas if name.startswith('ServiceUser')]
service_user_target = root / 'src/app/features/management/clients/service-users.generated.ts'
service_user_target.write_text('// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n'+'\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in service_user_names)+'\n')
subprocess.run(['npx','prettier','--write',str(service_user_target)],cwd=root,check=True,capture_output=True)


journal_names = [name for name in schemas if name.startswith('Journal')]
journal_target = root / 'src/app/features/management/journal/journal.generated.ts'
journal_target.write_text('// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n'+'\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in journal_names)+'\n')
subprocess.run(['npx','prettier','--write',str(journal_target)],cwd=root,check=True,capture_output=True)

medication_names = [name for name in schemas if name.startswith('Medication') or name in ['MarRead', 'MarWrite']]
medication_target = root / 'src/app/features/management/care/medication.generated.ts'
medication_target.write_text('// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n'+'\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in medication_names)+'\n')
subprocess.run(['npx','prettier','--write',str(medication_target)],cwd=root,check=True,capture_output=True)

professional_names = [name for name in schemas if name.startswith('Professional')]
professional_target = root / 'src/app/features/management/staff-portal/professional.generated.ts'
professional_target.write_text('// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n'+'\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in professional_names)+'\n')
subprocess.run(['npx','prettier','--write',str(professional_target)],cwd=root,check=True,capture_output=True)


risk_names = [name for name in schemas if name.startswith('Risk')]
risk_target = root / 'src/app/features/management/care/risk.generated.ts'
risk_target.write_text('// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in risk_names)+'\n')
subprocess.run(['npx','prettier','--write',str(risk_target)],cwd=root,check=True,capture_output=True)

roster_names = [name for name in schemas if name.startswith('Roster')]
roster_target = root / 'src/app/features/management/rota/roster.generated.ts'
roster_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in roster_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(roster_target)], cwd=root, check=True, capture_output=True)

visit_note_names = [name for name in schemas if name.startswith('VisitNote')]
visit_note_target = root / 'src/app/features/management/care/visit-notes.generated.ts'
visit_note_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in visit_note_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(visit_note_target)], cwd=root, check=True, capture_output=True)

care_document_names = [name for name in schemas if name.startswith('CareDocument')]
care_document_target = root / 'src/app/features/management/care/care-documents.generated.ts'
care_document_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in care_document_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(care_document_target)], cwd=root, check=True, capture_output=True)

care_event_names = [name for name in schemas if name.startswith('CareEvent')]
care_event_target = root / 'src/app/features/management/care/care-events.generated.ts'
care_event_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in care_event_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(care_event_target)], cwd=root, check=True, capture_output=True)

care_plan_names = [name for name in schemas if name.startswith('CarePlan')]
care_plan_target = root / 'src/app/features/management/care/care-plan.generated.ts'
care_plan_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in care_plan_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(care_plan_target)], cwd=root, check=True, capture_output=True)

ecm_names = [name for name in schemas if name.startswith('Ecm')]
ecm_target = root / 'src/app/features/management/ecm/ecm.generated.ts'
ecm_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in ecm_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(ecm_target)], cwd=root, check=True, capture_output=True)

quality_names = [name for name in schemas if name.startswith('Quality')]
quality_target = root / 'src/app/features/management/quality/quality.generated.ts'
quality_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in quality_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(quality_target)], cwd=root, check=True, capture_output=True)

portal_names = [name for name in schemas if name.startswith('StaffDashboard')]
portal_target = root / 'src/app/features/management/staff-portal/staff-dashboard.generated.ts'
portal_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in portal_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(portal_target)], cwd=root, check=True, capture_output=True)

my_learning_names = [name for name in schemas if name.startswith('AcademyMyLearning')]
my_learning_target = root / 'src/app/features/management/learning/academy/academy-my-learning.generated.ts'
my_learning_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in my_learning_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(my_learning_target)], cwd=root, check=True, capture_output=True)

my_courses_names = [name for name in schemas if name.startswith('AcademyMyCourses')]
my_courses_target = root / 'src/app/features/management/learning/academy/academy-my-courses.generated.ts'
my_courses_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in my_courses_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(my_courses_target)], cwd=root, check=True, capture_output=True)

my_assessments_names = [name for name in schemas if name.startswith('AcademyMyAssessments')]
my_assessments_target = root / 'src/app/features/management/learning/academy/academy-my-assessments.generated.ts'
my_assessments_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in my_assessments_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(my_assessments_target)], cwd=root, check=True, capture_output=True)

training_record_names = [name for name in schemas if name.startswith('AcademyTrainingRecord')]
training_record_target = root / 'src/app/features/management/learning/academy/academy-training-record.generated.ts'
training_record_target.write_text('// Generated from backend OpenAPI.\n\n' + '\n\n'.join('export type '+name+' = '+render(schemas[name])+';' for name in training_record_names) + '\n')
subprocess.run(['npx', 'prettier', '--write', str(training_record_target)], cwd=root, check=True, capture_output=True)

refresher_names = [name for name in schemas if name.startswith(("AcademyRefreshers", "AcademyRefresherAssignment", "AcademyRefresherReview"))]
refresher_target = root / "src/app/features/management/learning/academy/academy-refreshers.generated.ts"
refresher_target.write_text("// Generated from backend OpenAPI.\n\n" + "\n\n".join("export type " + name + " = " + render(schemas[name]) + ";" for name in refresher_names) + "\n")
subprocess.run(["npx", "prettier", "--write", str(refresher_target)], cwd=root, check=True, capture_output=True)

message_names = [name for name in schemas if name.startswith("AcademyTrainingMessage")]
message_target = root / "src/app/features/management/learning/academy/academy-messages.generated.ts"
message_target.write_text("// Generated from backend OpenAPI.\n\n" + "\n\n".join("export type " + name + " = " + render(schemas[name]) + ";" for name in message_names) + "\n")
subprocess.run(["npx", "prettier", "--write", str(message_target)], cwd=root, check=True, capture_output=True)
