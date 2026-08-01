#!/usr/bin/env python3
"""Preprocess simplemaps worldcities.csv into static/data/places.json.

Usage: python3 build-globe-data.py /path/to/worldcities.csv
Source: https://simplemaps.com/data/world-cities (free tier, CC BY 4.0).
"""
import csv
import json
import sys


def clean(s):
    return (s or "").strip()


def main(csv_path, out_path):
    countries = {}
    states = {}

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            capital = clean(row.get("capital"))
            if capital not in ("primary", "admin"):
                continue
            city = clean(row.get("city_ascii") or row.get("city"))
            country = clean(row.get("country"))
            admin = clean(row.get("admin_name"))
            if not city or not country:
                continue
            try:
                lat = round(float(row["lat"]), 3)
                lng = round(float(row["lng"]), 3)
            except (KeyError, ValueError):
                continue

            if capital == "primary":
                countries[clean(row.get("iso2")) or country] = {
                    "name": country,
                    "capital": city,
                    "lat": lat,
                    "lng": lng,
                }
            else:
                key = (clean(row.get("iso2")), admin)
                if key[0] and key[1] and key not in states:
                    states[key] = {
                        "name": admin,
                        "country": country,
                        "cc": key[0],
                        "capital": city,
                        "lat": lat,
                        "lng": lng,
                    }

    data = {
        "countries": sorted(countries.values(), key=lambda c: c["name"]),
        "states": sorted(states.values(), key=lambda s: (s["country"], s["name"])),
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"countries: {len(data['countries'])}")
    print(f"states:    {len(data['states'])}")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(f"usage: {sys.argv[0]} /path/to/worldcities.csv")
    main(sys.argv[1], "static/data/places.json")
