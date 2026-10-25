#!/usr/bin/env python3
"""Check source assets and project-pages-safe links without accessing Supabase."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import re,json,sys
root=Path(__file__).resolve().parents[1]
errors=[]; warnings=[]
class Refs(HTMLParser):
    def __init__(self, file): super().__init__(convert_charrefs=True);self.file=file
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        for key in ('src','href'):
            uri=a.get(key)
            if not uri or not isinstance(uri,str) or uri.startswith(('#','//','data:','mailto:','javascript:','blob:')): continue
            if any(x in uri for x in ('${','{{','<%')): continue
            o=urlsplit(uri)
            if o.scheme in ('http','https'): continue
            if o.path.startswith('/'):
                errors.append(f'{self.file.name}: root-absolute {key}={uri!r} breaks /repo/ Pages path')
                continue
            if not o.path or re.search(r'[{}<>]',o.path):continue
            path=(self.file.parent / unquote(o.path)).resolve()
            if not path.is_relative_to(root.resolve()):
                errors.append(f'{self.file.name}: path leaves project {uri}')
            elif not path.exists():errors.append(f'{self.file.name}: missing {key}={uri!r}')
for f in root.glob('*.html'):
    Refs(f).feed(f.read_text(encoding='utf-8',errors='replace'))
if not (root/'index.html').is_file(): errors.append('Missing index.html')
if not (root/'online_bridge.js').is_file():errors.append('Missing online_bridge.js')
manifest=root/'assets/skills_v23/manifest.json'
if manifest.is_file():
    s=manifest.read_text(encoding='utf-8')
    for ref in re.findall(r'"file"\s*:\s*"([^"]+)"',s):
        if not (root/ref.replace('./','',1)).is_file():errors.append(f'Missing skill image {ref}')
else: warnings.append('No skill manifest')
if errors:
    print('ERRORS:');print('\n'.join(errors[:60]));sys.exit(1)
for w in warnings: print('WARN:',w)
print(f'OK: {len(list(root.glob("*.html")))} HTML pages; all static links found.')
