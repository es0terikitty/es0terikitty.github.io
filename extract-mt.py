#!/usr/bin/env python3
"""Extract Mushoku Tensei PDFs into Zola markdown chapters."""

import subprocess, re, os

PDF_DIR = "/home/kabir/Downloads/Mushoku Tensei - Jobless Reincarnation"
OUTPUT_DIR = "/home/kabir/web-project/crime-punishment/content/mushoku-tensei"

HEADER_RE = re.compile(
    r'^\s*(Chapter \d+[^\n]*|Prologue[^\n]*|Epilogue[^\n]*|Extra Chapter[^\n]*)',
    re.IGNORECASE
)

def extract_text(pdf_path):
    result = subprocess.run(
        ["pdftotext", pdf_path, "-"],
        capture_output=True, text=True, timeout=120
    )
    return result.stdout

def slugify(text):
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text

def parse_vol_number(filename):
    m = re.search(r'(?:Volume|Vol)[.\s-]*(\d+)', filename, re.IGNORECASE)
    return int(m.group(1)) if m else 0

def clean_text(text):
    text = re.sub(r'\n?\s*\d+\s*\|\s*Page\s*\n?', '\n\n', text)
    text = re.sub(r'\n?\s*\d+\s*Page\s*\n?', '\n\n', text)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    lines = [l for l in text.split('\n') if not re.match(r'^\s*\d+\s*$', l.strip())]
    return '\n'.join(lines)

def locate_chapters(text):
    """Find chapter headers, keeping the last occurrence of each unique chapter."""
    lines = text.split('\n')
    all_matches = []
    for i, line in enumerate(lines):
        m = HEADER_RE.match(line)
        if m:
            all_matches.append((i, line.strip()))

    if not all_matches:
        return []

    def get_key(h):
        h_stripped = h.strip().rstrip(':')
        m = re.match(r'(Chapter\s+\d+)', h_stripped, re.IGNORECASE)
        if m:
            return m.group(1).lower()
        m = re.match(r'(Extra\s+Chapter)', h_stripped, re.IGNORECASE)
        if m:
            return m.group(1).lower()
        m = re.match(r'(Prologue|Epilogue)', h_stripped, re.IGNORECASE)
        if m:
            return m.group(1).lower()
        return h_stripped.lower()[:20]

    groups = {}
    for idx, header in all_matches:
        key = get_key(header)
        groups[key] = (idx, header)

    return sorted(groups.values(), key=lambda x: x[0])

def split_section_breaks(text):
    """Split text on *** section breaks. Returns list of (title, text)."""
    chunks = []
    current = []
    for line in text.split('\n'):
        stripped = line.strip()
        if stripped == '***' or stripped == '\x0c***':
            if current:
                title_line = next((l.strip() for l in current if l.strip()), "Section")
                title = title_line[:80]
                chunks.append((title, '\n'.join(current)))
            current = []
        else:
            current.append(line)
    if current:
        title_line = next((l.strip() for l in current if l.strip()), "Section")
        title = title_line[:80]
        chunks.append((title, '\n'.join(current)))
    return chunks

def make_frontmatter(title, weight, vol_num, ch_num, body):
    return f"""+++
title = "{title}"
date = 2026-07-20
weight = {weight}
[extra]
volume = {vol_num}
chapter = {ch_num}
+++

{body}
"""

def main():
    pdfs = sorted(
        [f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')],
        key=parse_vol_number
    )

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # Create top-level section index
    top_idx = os.path.join(OUTPUT_DIR, "_index.md")
    if not os.path.exists(top_idx):
        with open(top_idx, 'w') as f:
            f.write('+++\ntitle = "Mushoku Tensei"\ntemplate = "mushoku-tensei.html"\nrender = true\n+++\n')
    total_chapters = 0

    for pdf_name in pdfs:
        vol_num = parse_vol_number(pdf_name)
        if vol_num == 0:
            continue

        print(f"\n{'='*60}")
        print(f"Volume {vol_num:02d} ({pdf_name})")
        print(f"{'='*60}")

        pdf_path = os.path.join(PDF_DIR, pdf_name)
        text = extract_text(pdf_path)
        text = clean_text(text)

        chapters = locate_chapters(text)

        vol_output = os.path.join(OUTPUT_DIR, f"vol{vol_num:02d}")
        os.makedirs(vol_output, exist_ok=True)

        if chapters:
            print(f"  Found {len(chapters)} chapter headers")
            lines = text.split('\n')
            for ci, (idx, title) in enumerate(chapters):
                next_idx = chapters[ci + 1][0] if ci + 1 < len(chapters) else len(lines)
                chapter_text = '\n'.join(lines[idx:next_idx])
                chapter_text = re.sub(r'^[^\n]*\n?', '', chapter_text, count=1).strip()

                weight = ci
                m = re.search(r'(\d+)', title)
                ch_num = m.group(1) if m else str(ci + 1)
                slug = slugify(title[:60])
                ch_dir = os.path.join(vol_output, f"ch{ci:03d}-{slug}")
                os.makedirs(ch_dir, exist_ok=True)

                display_title = re.sub(r'[\s:]+$', '', title)
                content = make_frontmatter(display_title, weight, vol_num, ch_num, chapter_text)
                path = os.path.join(ch_dir, "index.md")
                with open(path, 'w') as f:
                    f.write(content)
                print(f"  ✓ [{weight:03d}] {title[:55]}")
                total_chapters += 1
        else:
            sections = split_section_breaks(text)
            sections = sections[1:] if len(sections) > 2 else sections

            if len(sections) <= 3:
                print(f"  {len(sections)} sections — saving as single page")
                full_text = '\n'.join(text.split('\n')).strip()[:5000]
                content = make_frontmatter(f"Volume {vol_num}", 0, vol_num, 1, full_text)
                path = os.path.join(vol_output, "index.md")
                with open(path, 'w') as f:
                    f.write(content)
                print(f"  ✓ Volume {vol_num}")
                total_chapters += 1
            else:
                print(f"  Split into {len(sections)} sections")
                for si, (title, section_text) in enumerate(sections):
                    section_text = section_text.strip()
                    slug = slugify(title[:50])
                    ch_dir = os.path.join(vol_output, f"sec{si:03d}-{slug}")
                    os.makedirs(ch_dir, exist_ok=True)
                    content = make_frontmatter(f"Volume {vol_num} — Part {si+1}", si, vol_num, si+1, section_text)
                    path = os.path.join(ch_dir, "index.md")
                    with open(path, 'w') as f:
                        f.write(content)
                    total_chapters += 1
                print(f"  ✓ {len(sections)} sections")

        idx_path = os.path.join(vol_output, "_index.md")
        with open(idx_path, 'w') as f:
            f.write('+++\ntitle = "Volume {vol_num}"\nsort_by = "weight"\n+++\n'.format(vol_num=vol_num))

    print(f"\n{'='*60}")
    print(f"Done! {total_chapters} total chapters extracted.")

if __name__ == "__main__":
    main()
