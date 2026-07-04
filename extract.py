import re, os, math

with open("/tmp/cp-full.txt") as f:
    text = f.read()

# Find chapter boundaries
pattern = r'(?=Part |Chapter |Epilogue)'
parts = re.split(pattern, text)

# Skip the first part (preface/translator's note)
# Build list of (part_label, chapter_label, chapter_text)
chapters = []
current_part = ""
for p in parts:
    if not p.strip():
        continue
    part_m = re.match(r'Part ([A-Z]+)\n', p)
    chap_m = re.match(r'Chapter ([A-Z]+)\n', p)
    epi_m = re.match(r'Epilogue\n', p)
    
    if part_m:
        current_part = part_m.group(1)
    elif epi_m:
        current_part = "Epilogue"
        chapters.append(("Epilogue", "", p.replace("Epilogue\n", "")))
    elif chap_m:
        num = chap_m.group(1)
        # Roman numeral to int
        roman_map = {'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VIII':8,'IX':9,'X':10,'XI':11,'XII':12}
        cn = roman_map.get(num, 0)
        chapters.append((current_part, cn, p.replace(f"Chapter {num}\n", "")))

print(f"Found {len(chapters)} chapters")

content_dir = "/home/kabir/crime-punishment/content/chapters"
os.makedirs(content_dir, exist_ok=True)

def slugify(s):
    return s.lower().replace(" ", "-")

# Write _index.md for chapters section
with open(f"{content_dir}/_index.md", "w") as f:
    f.write("+++\ntitle = \"Chapters\"\nrender = false\n+++\n")

# Write each chapter split into pages (~700 words each)
for idx, (part, chap_num, chap_text) in enumerate(chapters, 1):
    # Clean the text
    chap_text = chap_text.strip()
    # Remove page number artifacts and form feeds
    chap_text = re.sub(r'[\x0c]', '\n', chap_text)
    
    # Split into paragraphs
    paragraphs = [p.strip() for p in chap_text.split('\n\n') if p.strip()]
    
    # Group paragraphs into pages of ~700 words
    pages = []
    current_page = []
    current_words = 0
    target_words = 700
    
    for para in paragraphs:
        words = len(para.split())
        if current_words + words > target_words and current_page:
            pages.append('\n\n'.join(current_page))
            current_page = [para]
            current_words = words
        else:
            current_page.append(para)
            current_words += words
    
    if current_page:
        pages.append('\n\n'.join(current_page))
    
    total_pages = len(pages)
    
    part_label = f"Part {part}" if part and part != "Epilogue" else ("Epilogue" if part == "Epilogue" else "")
    
    for pidx, page_text in enumerate(pages, 1):
        page_slug = f"ch{part.lower()}-p{chap_num}p{pidx}" if chap_num else f"epilogue-p{pidx}"
        # Clean slug
        page_slug = re.sub(r'[^a-z0-9/_-]', '', page_slug)
        
        if pidx == 1:
            title = f"{part_label} — Chapter {chap_num}" if chap_num else part_label
        else:
            title = f"{part_label} — Chapter {chap_num} (p{pidx})" if chap_num else f"{part_label} (p{pidx})"
        
        page_dir = f"{content_dir}/{page_slug}"
        os.makedirs(page_dir, exist_ok=True)
        
        with open(f"{page_dir}/index.md", "w") as f:
            f.write("+++\n")
            f.write(f"title = \"{title}\"\n")
            f.write(f"date = 2026-07-04\n")
            f.write("[extra]\n")
            if chap_num:
                f.write(f"chapter = {chap_num}\n")
            else:
                f.write(f"chapter = 0\n")
            f.write(f"page = {pidx}\n")
            f.write(f"total = {total_pages}\n")
            f.write(f"part = \"{part}\"\n")
            f.write("+++\n\n")
            f.write(page_text)
            f.write("\n")
    
    print(f"  {part_label} Ch{chap_num}: {total_pages} pages")

print("\nDone!")
