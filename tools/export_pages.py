#!/usr/bin/env python3
"""Copy ONLY public game files into GitHub Pages artifact."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
out=root/'_site'
if out.exists():shutil.rmtree(out)
out.mkdir()
for file in root.iterdir():
    if file.is_file() and (file.suffix in {'.html','.js','.css'} or file.name in {'.nojekyll','CNAME'}):
        shutil.copy2(file,out/file.name)
if (root/'assets').is_dir():
    shutil.copytree(root/'assets',out/'assets')
assert (out/'index.html').is_file(), 'Missing site index.html'
print(f'GitHub Pages export: {sum(1 for p in out.rglob("*") if p.is_file())} files')
