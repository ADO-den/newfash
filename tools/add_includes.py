#!/usr/bin/env python3
import os
import glob

ROOT = os.path.dirname(os.path.dirname(__file__))
html_files = glob.glob(os.path.join(ROOT, '*.html'))
changed = []

for path in html_files:
    name = os.path.splitext(os.path.basename(path))[0]
    css_candidates = [os.path.join('css', f'{name}.css'), os.path.join('css', 'style.css')]
    js_candidates = [os.path.join('js', f'{name}.js'), os.path.join('js', 'script.js')]

    chosen_css = None
    for c in css_candidates:
        if os.path.exists(os.path.join(ROOT, c)):
            chosen_css = c.replace('\\', '/')
            break
    if not chosen_css:
        chosen_css = css_candidates[-1].replace('\\', '/')

    chosen_js = None
    for j in js_candidates:
        if os.path.exists(os.path.join(ROOT, j)):
            chosen_js = j.replace('\\', '/')
            break
    if not chosen_js:
        chosen_js = js_candidates[-1].replace('\\', '/')

    with open(path, 'r', encoding='utf-8') as f:
        txt = f.read()

    new_txt = txt
    # insert CSS link before </head> if missing
    link_tag = f'<link rel="stylesheet" href="{chosen_css}" />'
    if link_tag not in txt:
        if '</head>' in new_txt:
            new_txt = new_txt.replace('</head>', '  ' + link_tag + '\n</head>')
        else:
            new_txt = link_tag + '\n' + new_txt

    # insert JS script before </body> if missing
    script_tag = f'<script src="{chosen_js}"></script>'
    if script_tag not in new_txt:
        if '</body>' in new_txt:
            # prefer placing after existing bootstrap bundle if present
            if 'bootstrap.bundle.min.js' in new_txt:
                new_txt = new_txt.replace('bootstrap.bundle.min.js"></script>', 'bootstrap.bundle.min.js"></script>\n  ' + script_tag)
            else:
                new_txt = new_txt.replace('</body>', '  ' + script_tag + '\n</body>')
        else:
            new_txt = new_txt + '\n' + script_tag

    if new_txt != txt:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_txt)
        changed.append(path)

print('Processed', len(html_files), 'HTML files; updated', len(changed), 'files.')
for p in changed:
    print('Updated:', os.path.basename(p))
