#!/usr/bin/env python3
import os
import glob
ROOT = os.path.dirname(os.path.dirname(__file__))
old = '2348123456789'
new = '2348136754060'
count = 0
files_changed = []
for pattern in ['*.html', 'js/*.js']:
    for path in glob.glob(os.path.join(ROOT, pattern)):
        with open(path, 'r', encoding='utf-8') as f:
            txt = f.read()
        if old in txt:
            txt2 = txt.replace(old, new)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(txt2)
            files_changed.append(path)
            count += txt.count(old)
print('Replaced', count, 'occurrences in', len(files_changed), 'files')
for p in files_changed:
    print('Updated:', os.path.basename(p))
