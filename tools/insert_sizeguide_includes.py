import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
html_files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    for f in filenames:
        if f.lower().endswith('.html'):
            html_files.append(os.path.join(dirpath, f))

link_tag = '<link rel="stylesheet" href="css/size-guide.css" />'
script_tag = '<script src="js/size-guide.js"></script>'

changed = []
for path in html_files:
    with open(path, 'r', encoding='utf-8') as fh:
        content = fh.read()
    new = content
    # add link in head if missing
    if 'css/size-guide.css' not in content:
        # find closing </head>
        idx = new.lower().find('</head>')
        if idx!=-1:
            new = new[:idx] + '  ' + link_tag + '\n' + new[idx:]
    # add script before </body> if missing
    if 'js/size-guide.js' not in content:
        idx = new.lower().rfind('</body>')
        if idx!=-1:
            new = new[:idx] + '  ' + script_tag + '\n' + new[idx:]
    if new!=content:
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(new)
        changed.append(path)
        print('Updated includes in', path)

print('\nDone. Updated', len(changed), 'files')
