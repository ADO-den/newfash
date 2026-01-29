import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

html_files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    for f in filenames:
        if f.lower().endswith('.html'):
            html_files.append(os.path.join(dirpath, f))

card_re = re.compile(r'(<(?:div|article)[\s\S]*?class="[^"]*product-card[^"]*"[\s\S]*?</(?:div|article)>)', re.IGNORECASE)
category_re = re.compile(r'data-category="([^"]+)"', re.IGNORECASE)

changed = []
fixed_links = []

for path in html_files:
    with open(path, 'r', encoding='utf-8') as fh:
        content = fh.read()

    cards = card_re.findall(content)
    count = len(cards)
    if count >= 30:
        continue
    needed = 30 - count

    if not cards:
        print(f"No product-card found in {path}, skipping.")
        continue

    last_card = cards[-1]
    mcat = category_re.search(last_card)
    category = (mcat.group(1) if mcat else os.path.splitext(os.path.basename(path))[0]).split()[0]
    # prepare clone with image src replaced to a valid unsplash URL for the category
    clone = last_card
    # replace any src="..." for images inside clone
    clone = re.sub(r'src="[^"]+"', f'src="https://source.unsplash.com/featured/?{category}"', clone)

    # Insert clones before closing of the row. Prefer the comment marker, else before </main>.
    insert_at = None
    marker = '</div> <!-- /.row -->'
    if marker in content:
        insert_at = content.rfind(marker)
    else:
        # try to find the row container end by locating the closing of the last card's parent row
        # find the last occurrence of '\n      </div> <!-- /.container -->' and insert before it
        marker2 = '\n      </div> <!-- /.container -->'
        if marker2 in content:
            # find the location of the closing row by searching backwards from container closing
            idx = content.rfind(marker2)
            # search backwards for the last </div> that closes the row (approx)
            prev_idx = content.rfind('\n      </div>', 0, idx)
            if prev_idx != -1:
                insert_at = prev_idx
    if insert_at is None:
        # fallback to insert before </main>
        insert_at = content.rfind('</main>')
        if insert_at == -1:
            print(f"Couldn't find insertion point for {path}, skipping.")
            continue

    # build insertion string: wrap clones in the same column wrapper if last_card starts with a column
    # try to extract the column wrapper start before last_card
    col_wrapper_re = re.compile(r'(<div class="col-[^"]*">)\s*' + re.escape(last_card), re.IGNORECASE)
    col_match = col_wrapper_re.search(content)
    insertion = ''
    # If we can detect the column wrapper start tag in the source where last_card appears, clone the whole column snippet
    # fallback: wrap card in a generic column
    if '<div class="col-' in content:
        # try to find last '<div class="col-' occurrence and then capture until the end of the card
        last_col_idx = content.rfind('<div class="col-')
        # find end of that column (first closing </div> after last_card end)
        # naive: find the closing pattern by locating '</div>' after last_col_idx + 10 several times
        # we'll extract from last_col_idx up to the end of last_card's closing tag occurrence
        # find end of last_card in content
        card_match_iter = list(card_re.finditer(content))
        if card_match_iter:
            last_card_match = card_match_iter[-1]
            end_of_last_card = last_card_match.end()
            # now find the next "</div>" after end_of_last_card that likely closes the column
            close_pos = content.find('</div>', end_of_last_card)
            if close_pos != -1:
                col_snippet = content[last_col_idx:close_pos+6]
                # create clones of that column snippet, updating image src inside
                for i in range(needed):
                    new_snip = re.sub(r'src="[^"]+"', f'src="https://source.unsplash.com/featured/?{category}"', col_snippet)
                    insertion += '\n        ' + new_snip
            else:
                # fallback to card only
                for i in range(needed):
                    insertion += '\n        <div class="col-6 col-md-4 col-lg-3">' + clone + '\n        </div>'
        else:
            for i in range(needed):
                insertion += '\n        <div class="col-6 col-md-4 col-lg-3">' + clone + '\n        </div>'

    # insert
    new_content = content[:insert_at] + insertion + content[insert_at:]
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(new_content)
    changed.append((path, count, 30))
    print(f"Updated {path}: {count} -> 30 product cards")

    # quick link fix: find href="...html" and verify target exists; if not, try pluralize 'woman'->'women' or lowercase correction
    hrefs = re.findall(r'href="([^"]+\.html)"', new_content)
    for href in hrefs:
        target = os.path.join(os.path.dirname(path), href)
        # normalize
        target_norm = os.path.normpath(target)
        if os.path.exists(target_norm):
            continue
        # try same folder filename
        alt = os.path.join(ROOT, os.path.basename(href))
        if os.path.exists(alt):
            # update to basename
            new_content = new_content.replace(f'href="{href}"', f'href="{os.path.basename(href)}"')
            fixed_links.append((path, href, os.path.basename(href)))
        else:
            # try pluralize woman->women
            if 'woman.html' in href:
                if os.path.exists(os.path.join(os.path.dirname(path), 'women.html')):
                    new_content = new_content.replace('woman.html', 'women.html')
                    fixed_links.append((path, href, 'women.html'))
    # write again if link fixes applied
    if fixed_links:
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(new_content)

print('\nSummary:')
for p,c,t in changed:
    print(f' - {p}: {c} -> {t}')
if fixed_links:
    print('\nLink fixes:')
    for p,a,b in fixed_links:
        print(f' - {p}: {a} -> {b}')
else:
    print('No link fixes applied')
