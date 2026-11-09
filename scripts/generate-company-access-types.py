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
