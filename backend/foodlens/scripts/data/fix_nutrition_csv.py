"""
Add portion_g (weight) column, units row, fix malformed numbers. Remove estimated and duplicates.
"""
import csv
import os
import re

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INPUT_CSV = os.path.join(BACKEND_DIR, "nutrition_database_complete.csv")
OUTPUT_CSV = os.path.join(BACKEND_DIR, "nutrition_database_complete.csv")


def fix_number(value):
    """Fix values like 1.000.32 -> 1000.32 (comma was parsed as dot)."""
    if not value or value in ("0", "0.00"):
        return value
    m = re.match(r"^(\d+)\.(\d{3})\.(\d+)$", value)
    if m:
        return m.group(1) + m.group(2) + "." + m.group(3)
    m = re.match(r"^(\d+)\.(\d{3})\.(\d{2})$", value)
    if m:
        return m.group(1) + m.group(2) + "." + m.group(3)
    return value


def main():
    rows = []
    comments = []
    with open(INPUT_CSV, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        _header = next(reader)
        for row in reader:
            if not row:
                continue
            first = (row[0] or "").strip()
            if first.startswith("#"):
                comments.append(row)
                continue
            if len(row) < 10:
                continue
            if len(row) >= 10 and row[9].strip().lower() == "estimated":
                continue

            name = row[0]
            cal = fix_number(row[1])
            carbs = fix_number(row[2])
            protein = fix_number(row[3])
            fat = fix_number(row[4])
            fiber = fix_number(row[5])
            sodium = fix_number(row[6])
            potassium = fix_number(row[7])
            sugar = fix_number(row[8])
            source = row[9] if len(row) > 9 else "foodcompositiondb.lk"
            rows.append([name, "100", cal, carbs, protein, fat, fiber, sodium, potassium, sugar, source])

    seen = set()
    unique = []
    for r in rows:
        key = r[0].strip().lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)

    new_header = [
        "food_name",
        "portion_g",
        "calories_kcal",
        "carbs_g",
        "protein_g",
        "fat_g",
        "fiber_g",
        "sodium_mg",
        "potassium_mg",
        "sugar_g",
        "source",
    ]
    units_row = ["# (per portion)", "g", "kcal", "g", "g", "g", "g", "mg", "mg", "g", "-"]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(new_header)
        w.writerow(units_row)
        for c in comments:
            w.writerow(c)
        for r in unique:
            w.writerow(r)

    print(f"Wrote {len(unique)} rows. Removed {len(rows) - len(unique)} duplicates. Header and units row added.")


if __name__ == "__main__":
    main()
