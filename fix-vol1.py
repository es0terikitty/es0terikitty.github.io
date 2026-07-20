#!/usr/bin/env python3
"""Re-split Volume 1 using correct page boundaries from user's table."""

import subprocess, re, os, shutil

PDF_PATH = "/home/kabir/Downloads/Mushoku Tensei - Jobless Reincarnation/Mushoku Tensei - Jobless Reincarnation Volume-1.pdf"
OUTPUT_DIR = "/home/kabir/web-project/crime-punishment/content/mushoku-tensei/vol01"

CHAPTERS = [
    (11, "Prologue"),
    (21, "Chapter 1", "Is This Another World?"),
    (29, "Chapter 2", "The Creeped-Out Maid"),
    (38, "Chapter 3", "A Textbook of Magic"),
    (54, "Chapter 4", "Master"),
    (84, "Chapter 5", "Swords and Sorcery"),
    (96, "Chapter 6", "Reasons for Respect"),
    (113, "Chapter 7", "Friends"),
    (141, "Chapter 8", "Obliviousness"),
    (166, "Chapter 9", "Emergency Family Meeting"),
    (186, "Chapter 10", "Stunted Growth"),
    (214, "Chapter 11", "Parted"),
    (233, "Extra Chapter", "The Mother of the Greyrat Family"),
]

def slugify(text):
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text

def main():
    result = subprocess.run(["pdftotext", PDF_PATH, "-"], capture_output=True, text=True, timeout=120)
    pages = result.stdout.split('\x0c')
    total_pages = len(pages)
    print(f"Total pages: {total_pages}")

    # Clean output dir
    for item in os.listdir(OUTPUT_DIR):
        ip = os.path.join(OUTPUT_DIR, item)
        if os.path.isdir(ip):
            shutil.rmtree(ip)

    for i, entry in enumerate(CHAPTERS):
        start_page = entry[0]
        ch_type = entry[1]
        title = entry[2] if len(entry) > 2 else ""
        end_page = CHAPTERS[i + 1][0] - 1 if i + 1 < len(CHAPTERS) else total_pages

        chapter_pages = []
        for pi in range(start_page - 1, min(end_page, total_pages)):
            pt = pages[pi]
            pt = re.sub(r'\n?\s*\d+\s*\|\s*Page\s*\n?', '\n\n', pt)
            pt = re.sub(r'\n?\s*\d+\s*Page\s*\n?', '\n\n', pt)
            pt = re.sub(r'(?i)Just Light Novels\s*', '', pt)
            pt = re.sub(r'\n?\s*\d+ \| P a g e\s*\n?', '\n\n', pt)
            chapter_pages.append(pt)

        full_text = '\n'.join(chapter_pages).strip()
        full_text = re.sub(r'\n{3,}', '\n\n', full_text)

        display_title = f"{ch_type}: {title}" if title else ch_type
        ch_slug = slugify(f"{ch_type}-{title}"[:60]) if title else slugify(ch_type)
        ch_dir = os.path.join(OUTPUT_DIR, ch_slug)
        os.makedirs(ch_dir, exist_ok=True)

        content = f"""+++
title = "{display_title}"
date = 2026-07-20
weight = {i}
[extra]
volume = 1
chapter = {i + 1}
+++

{full_text}
"""
        with open(os.path.join(ch_dir, "index.md"), 'w') as f:
            f.write(content)
        print(f"  [{i:02d}] {display_title}  (pgs {start_page}–{end_page})")

    with open(os.path.join(OUTPUT_DIR, "_index.md"), 'w') as f:
        f.write('+++\ntitle = "Volume 1"\nsort_by = "weight"\n+++\n')

    print(f"\nDone — {len(CHAPTERS)} chapters.")

if __name__ == "__main__":
    main()
