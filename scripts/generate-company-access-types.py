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
