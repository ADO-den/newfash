import os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
html_files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    for f in filenames:
        if f.lower().endswith('.html'):
            html_files.append(os.path.join(dirpath, f))

card_re = re.compile(r'class="[^"]*product-card[^"]*"', re.IGNORECASE)
href_re = re.compile(r'href="([^"]+\.html)"', re.IGNORECASE)

ok = True
for path in sorted(html_files):
    with open(path, 'r', encoding='utf-8') as fh:
        c = fh.read()
    cards = len(card_re.findall(c))
    if cards < 30:
        print(f'UNDER: {path} has {cards} product-card entries')
        ok = False
    # check hrefs
    hrefs = href_re.findall(c)
    for href in set(hrefs):
        target = os.path.join(os.path.dirname(path), href)
        if not os.path.exists(os.path.normpath(target)):
            # also check workspace root basename
            alt = os.path.join(ROOT, os.path.basename(href))
            if not os.path.exists(os.path.normpath(alt)):
                print(f'BROKEN LINK in {path}: {href} (missing)')
                ok = False

if ok:
    print('All pages have >=30 cards and no missing .html links detected')
else:
    print('\nValidation found issues as shown above')
