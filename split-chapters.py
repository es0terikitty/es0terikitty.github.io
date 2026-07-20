#!/usr/bin/env python3
"""Split a Mushoku Tensei PDF into proper chapter files given chapter page numbers."""

import subprocess, re, os, shutil, sys

PDF_DIR = "/home/kabir/Downloads/Mushoku Tensei - Jobless Reincarnation"
OUTPUT_BASE = "/home/kabir/web-project/crime-punishment/content/mushoku-tensei"

def slugify(text):
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text

def clean_page_text(text):
    text = re.sub(r'\n?\s*\d+\s*\|\s*Page\s*\n?', '\n\n', text)
    text = re.sub(r'\n?\s*\d+\s*Page\s*\n?', '\n\n', text)
    text = re.sub(r'(?i)Just Light Novels\s*', '', text)
    text = re.sub(r'\n?\s*\d+ \| P a g e\s*\n?', '\n\n', text)
    return text

def split_volume(vol_num, chapters):
    """chapters is list of (start_page, label, subtitle_or_None)"""
    pdf_name = f"Mushoku Tensei - Jobless Reincarnation Volume-{vol_num}.pdf"
    pdf_path = os.path.join(PDF_DIR, pdf_name)
    if not os.path.exists(pdf_path):
        pdf_name = f"Mushoku Tensei_ Jobless Reincarnation Vol. {vol_num}.pdf"
        pdf_path = os.path.join(PDF_DIR, pdf_name)
        if not os.path.exists(pdf_path):
            print(f"  ERROR: PDF not found for volume {vol_num}")
            return

    print(f"\nVolume {vol_num:02d} ({pdf_name})")
    result = subprocess.run(["pdftotext", pdf_path, "-"], capture_output=True, text=True, timeout=120)
    pages = result.stdout.split('\x0c')
    total_pages = len(pages)

    vol_dir = os.path.join(OUTPUT_BASE, f"vol{vol_num:02d}")
    os.makedirs(vol_dir, exist_ok=True)

    for item in os.listdir(vol_dir):
        item_path = os.path.join(vol_dir, item)
        if os.path.isdir(item_path) and item != "_index.md":
            shutil.rmtree(item_path)

    for i, entry in enumerate(chapters):
        start_page = entry[0]
        ch_type = entry[1]
        title = entry[2] if len(entry) > 2 else None
        end_page = chapters[i + 1][0] - 1 if i + 1 < len(chapters) else total_pages

        chapter_pages = []
        for pi in range(start_page - 1, min(end_page, total_pages)):
            chapter_pages.append(clean_page_text(pages[pi]))

        full_text = '\n'.join(chapter_pages).strip()
        full_text = re.sub(r'\n{3,}', '\n\n', full_text)
        full_text = re.sub(r'^\s*\n+', '', full_text)

        display_title = f"{ch_type}: {title}" if title else ch_type
        slug_base = f"{ch_type}-{title}"[:60] if title else ch_type
        ch_slug = slugify(slug_base)
        ch_dir = os.path.join(vol_dir, ch_slug)
        os.makedirs(ch_dir, exist_ok=True)

        content = f"""+++
title = "{display_title}"
date = 2026-07-20
weight = {i}
[extra]
volume = {vol_num}
chapter = {i + 1}
+++

{full_text}
"""
        with open(os.path.join(ch_dir, "index.md"), 'w') as f:
            f.write(content)
        print(f"  [{i:02d}] {display_title}  (pgs {start_page}–{end_page})")

    with open(os.path.join(vol_dir, "_index.md"), 'w') as f:
        f.write(f'+++\ntitle = "Volume {vol_num}"\nsort_by = "weight"\n+++\n')

    print(f"  → {len(chapters)} chapters")

VOLUMES = {
    2: [
        (11, "Prologue"),
        (13, "Chapter 1", "The Young Mistress's Violence"),
        (34, "Chapter 2", "All According to Plan?"),
        (67, "Chapter 3", "Her Ferocity, Unabated"),
        (87, "Chapter 4", "Staff Meeting and Sunday"),
        (107, "Chapter 5", "The Young Miss Turns Ten"),
        (134, "Chapter 6", "Learning A Foreign Language"),
        (159, "Chapter 7", "Absolute Promise"),
        (189, "Chapter 8", "The Turning Point"),
        (220, "Extra Chapter", "The Forest Goddess"),
    ],
    3: [
        (11, "Chapter 1", "The Con Artist Who Claimed to Be a God"),
        (21, "Chapter 2", "The Superd"),
        (38, "Chapter 3", "A Master's Secrets"),
        (52, "Chapter 4", "The Foundations of Trust"),
        (69, "Chapter 5", "Three Days to the Nearest Town"),
        (91, "Chapter 6", "Infiltration and Impersonation"),
        (108, "Chapter 7", "The Adventurers' Guild"),
        (135, "Chapter 8", "The Adventurers' Inn"),
        (158, "Chapter 9", "The First Job: The Value of a Life"),
        (180, "Chapter 10", "The First Job Completed"),
        (201, "Chapter 11", "A Smooth Start"),
        (219, "Chapter 12", "Children and Warriors"),
        (246, "Chapter 13", "Failure, Chaos, and Resolve"),
        (271, "Chapter 14", "The Beginning of Our Journey"),
        (297, "Extra Chapter", "The Princess of Asura and the Angel"),
    ],
    4: [
        (12, "Chapter 1", "Wind Port"),
        (32, "Chapter 2", "Missed Connections, the Prequel"),
        (51, "Chapter 3", "Missed Connections, the Sequel"),
        (96, "Chapter 4", "The Sage on Board"),
        (113, "Chapter 5", "The Demon in the Warehouse"),
        (126, "Chapter 6", "The Beastfolk Children"),
        (146, "Chapter 7", "Free Apartment"),
        (165, "Chapter 8", "Fire Emergency"),
        (189, "Chapter 9", "Slow Life in the Doldia Village"),
        (211, "Chapter 10", "The Holy Sword Highway"),
        (234, "Extra Chapter", "Guardian Fitz"),
    ],
}

if __name__ == "__main__":
    vols = [int(a) for a in sys.argv[1:]] if len(sys.argv) > 1 else list(VOLUMES.keys())
    for v in vols:
        if v in VOLUMES:
            split_volume(v, VOLUMES[v])
        else:
            print(f"No chapter data for volume {v}")
