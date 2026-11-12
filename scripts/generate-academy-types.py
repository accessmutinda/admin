"""Generate academy transport types from the executable backend contract."""
import json
import sys
from pathlib import Path

schemas = json.loads(Path(sys.argv[1]).read_text())['components']['schemas']


def render(value):
    if '$ref' in value:
        result = value['$ref'].rsplit('/', 1)[-1]
        if not result.startswith('Academy'):
            result = 'Academy' + result
    elif 'enum' in value:
        result = ' | '.join(json.dumps(item) for item in value['enum'])
    elif value.get('type') == 'array':
        result = '(' + render(value['items']) + ')[]'
    elif value.get('type') == 'object' or 'properties' in value:
        properties = value.get('properties', {})
        if properties:
            result = '{\n' + '\n'.join('  '+json.dumps(key)+('' if key in value.get('required', []) else '?')+': '+render(field)+';' for key,field in properties.items()) + '\n}'
        else:
            result = 'Record<string, unknown>'
    else:
        result = {'string':'string','integer':'number','number':'number','boolean':'boolean'}.get(value.get('type'),'unknown')
    return result + (' | null' if value.get('nullable') else '')


output = Path(__file__).resolve().parents[1] / 'src/app/features/management/learning/academy/academy.generated.ts'
output.write_text('// Generated from the backend academy OpenAPI contract.\n' + '\n\n'.join('export type '+name+' = '+render(value)+';' for name,value in schemas.items() if name.startswith('Academy'))+'\n')
