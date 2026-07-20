#!/usr/bin/env python3
"""Extract Volume 6 with proper chapter splits and illustrations."""

import subprocess, re, os, shutil, sys

PDF_DIR = "/home/kabir/Downloads/Mushoku Tensei - Jobless Reincarnation"
OUTPUT_BASE = "/home/kabir/web-project/crime-punishment/content/mushoku-tensei"

CHAPTERS = [
    (11,  "Chapter 1",   "Route Selection"),
    (24,  "Chapter 2",   "Rice"),
    (38,  "Chapter 3",   "The Shirone Kingdom"),
    (54,  "Chapter 4",   "There Is No God"),
    (82,  "Chapter 5",   "The Third Prince"),
    (101, "Chapter 6",   "A Speedy Resolution"),
    (115, "Chapter 7",   "The Birth of My Little Sister, the Maid"),
    (126, "Chapter 8",   "An Adult"),
    (137, "Chapter 9",   "The Second Turning Point"),
    (153, "Chapter 10",  "The Wide, Gaping Hole in My Chest"),
    (163, "Chapter 11",  "Journey's End"),
    (179, "Chapter 12",  "The Reality of the Calamity"),
    (197, "Chapter 13",  "The Young Miss's Resolution"),
    (222, "Interlude",   "The Two She Encountered"),
    (243, "Extra Chapter", "Distorted, But Unchanged"),
]

MIN_IMAGE_SIZE = 50000

def clean_text(text):
    text = re.sub(r'\n?\s*\d+\s*\|\s*Page\s*\n?', '\n\n', text)
    text = re.sub(r'\n?\s*\d+\s*Page\s*\n?', '\n\n', text)
    text = re.sub(r'(?i)Just Light Novels\s*', '', text)
    text = re.sub(r'\n?\s*\d+ \| P a g e\s*\n?', '\n\n', text)
    text = re.sub(r'\x0c', '', text)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    return text.strip()

def slugify(text):
    text = re.sub(r"[^\w\s'-]", '', text).strip().lower()
    text = re.sub(r"[-\s]+", '-', text).strip('-')
    return text

def main():
    vol_num = 6
    pdf_path = os.path.join(PDF_DIR, f"Mushoku Tensei - Jobless Reincarnation Volume-{vol_num}.pdf")
    if not os.path.exists(pdf_path):
        pdf_path = os.path.join(PDF_DIR, f"Mushoku Tensei_ Jobless Reincarnation Vol. {vol_num}.pdf")
    if not os.path.exists(pdf_path):
        print(f"PDF not found")
        return

    r = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True, timeout=15)
    total_pages = 0
    for line in r.stdout.split('\n'):
        if line.startswith("Pages:"):
            total_pages = int(line.split()[1])
            break

    print("Extracting text...")
    r = subprocess.run(["pdftotext", pdf_path, "-"], capture_output=True, text=True, timeout=120)
    pages = r.stdout.split('\x0c')

    print("Getting image list...")
    r = subprocess.run(["pdfimages", "-list", pdf_path], capture_output=True, text=True, timeout=30)
    images = {}
    for line in r.stdout.split('\n')[2:]:
        parts = line.split()
        if len(parts) >= 15 and parts[1].isdigit():
            page = int(parts[0])
            num = int(parts[1])
            w = int(parts[3])
            h = int(parts[4])
            enc = parts[8]
            size_str = parts[14]
            size_mult = {'K': 1024, 'M': 1024*1024, 'B': 1}
            size = int(size_str[:-1]) * size_mult[size_str[-1]] if size_str[-1] in size_mult else 0
            if enc == "jpeg" and size > MIN_IMAGE_SIZE and w > 500 and h > 500:
                images[page] = num

    print("Extracting images...")
    os.makedirs("/tmp/mt-img", exist_ok=True)
    subprocess.run(["pdfimages", "-j", pdf_path, "/tmp/mt-img/img"], capture_output=True, timeout=120)

    vol_dir = os.path.join(OUTPUT_BASE, f"vol{vol_num:02d}")
    os.makedirs(vol_dir, exist_ok=True)

    for item in os.listdir(vol_dir):
        item_path = os.path.join(vol_dir, item)
        if os.path.isdir(item_path) and item != "_index.md":
            shutil.rmtree(item_path)

    for i, (start_page, ch_type, title) in enumerate(CHAPTERS):
        end_page = CHAPTERS[i + 1][0] - 1 if i + 1 < len(CHAPTERS) else total_pages
        ch_slug = slugify(f"{ch_type}-{title}"[:80])
        ch_dir = os.path.join(vol_dir, ch_slug)
        os.makedirs(ch_dir, exist_ok=True)

        chapter_content = ""
        for page in range(start_page, end_page + 1):
            if page in images:
                num = images[page]
                src = None
                for ext in ["jpg", "png", "ppm"]:
                    p = f"/tmp/mt-img/img-{num:03d}.{ext}"
                    if os.path.exists(p):
                        src = p
                        break
                if src:
                    dst = os.path.join(ch_dir, f"illustration-{page}.jpg")
                    shutil.copy2(src, dst)
                    chapter_content += f"![Illustration](illustration-{page}.jpg)\n\n"

            pi = page - 1
            if pi < len(pages):
                page_text = clean_text(pages[pi])
                if page_text:
                    chapter_content += page_text + "\n\n"

        display_title = f"{ch_type}: {title}" if title else ch_type
        content = f"""+++
title = "{display_title}"
date = 2026-07-20
weight = {i}
[extra]
volume = {vol_num}
chapter = {i + 1}
+++

{chapter_content.strip()}
"""
        with open(os.path.join(ch_dir, "index.md"), 'w') as f:
            f.write(content)
        ill_count = sum(1 for p in images if start_page <= p <= end_page)
        print(f"  [{i:02d}] {display_title}  (pgs {start_page}–{end_page})  {ill_count} ill")

    # Color plates
    for page in range(1, CHAPTERS[0][0]):
        if page in images:
            num = images[page]
            src = None
            for ext in ["jpg", "png", "ppm"]:
                p = f"/tmp/mt-img/img-{num:03d}.{ext}"
                if os.path.exists(p):
                    src = p
                    break
            if src:
                dst = os.path.join(vol_dir, f"color-plate-{page}.jpg")
                shutil.copy2(src, dst)

    # _index.md
    with open(os.path.join(vol_dir, "_index.md"), 'w') as f:
        f.write(f'+++\ntitle = "Volume {vol_num}"\nsort_by = "weight"\n+++\n')

    # Illustrations page
    color_plates = sorted(f for f in os.listdir(vol_dir) if f.startswith("color-plate-") and f.endswith(".jpg"))
    if color_plates:
        ill_dir = os.path.join(vol_dir, "illustrations")
        os.makedirs(ill_dir, exist_ok=True)
        ill_content = f'+++\ntitle = "Illustrations"\ndate = 2026-07-20\nweight = 99\n[extra]\nvolume = {vol_num}\nchapter = 0\n+++\n\n'
        for cp in color_plates:
            ill_content += f"![Color illustration](../{cp})\n\n"
        with open(os.path.join(ill_dir, "index.md"), 'w') as f:
            f.write(ill_content)

    shutil.rmtree("/tmp/mt-img")
    print(f"\n  → {len(CHAPTERS)} chapters, {len(images)} images")

if __name__ == "__main__":
    main()
