"""
Fetch Sri Lankan Food Composition Database (FCDB) from foodcompositiondb.lk/food/1 to 240
and build/update nutrition_database_complete.csv.
"""
import csv
import html
import os
import re
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE_URL = "https://www.foodcompositiondb.lk/food/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_CSV = os.path.join(BACKEND_DIR, "nutrition_database_complete.csv")


def fetch_page(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_food_page(page_html, food_id):
    """Parse FCDB food page HTML. Returns dict with food_name and nutrient keys or None."""
    name_match = re.search(r"<h1[^>]*>([^<]+)</h1>", page_html, re.I)
    if not name_match:
        name_match = re.search(r"<title>([^<]+)</title>", page_html, re.I)
    if not name_match:
        return None
    food_name = html.unescape(name_match.group(1).strip())
    if not food_name or food_name.lower() == "sri lankan food composition database":
        return None

    data = {}
    row_pattern = re.compile(
        r"<td[^>]*>([^<]+)</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>",
        re.I,
    )
    rows = row_pattern.findall(page_html)

    seen_energy = False
    for name, amount, unit in rows:
        name = name.strip()
        amount = amount.strip().replace(",", ".")
        unit = (unit or "").strip().lower()
        if not name:
            continue
        if name == "Energy" and unit == "kcal" and not seen_energy:
            data["calories_kcal"] = amount
            seen_energy = True
        elif name == "Carbohydrates" and unit == "g":
            data["carbs_g"] = amount
        elif name == "Fat" and unit == "g":
            data["fat_g"] = amount
        elif name == "Proteins" and unit == "g":
            data["protein_g"] = amount
        elif name == "Fiber" and unit == "g":
            data["fiber_g"] = amount
        elif name == "Sodium" and unit == "mg":
            data["sodium_mg"] = amount
        elif name == "Potassium" and unit == "mg":
            data["potassium_mg"] = amount
        elif name == "Sugar" or (name == "Sugars" and unit == "g"):
            data["sugar_g"] = amount

    if "calories_kcal" not in data:
        return None

    data.setdefault("carbs_g", "0")
    data.setdefault("protein_g", "0")
    data.setdefault("fat_g", "0")
    data.setdefault("fiber_g", "0")
    data.setdefault("sodium_mg", "0")
    data.setdefault("potassium_mg", "0")
    data.setdefault("sugar_g", "0")
    data["food_name"] = food_name
    return data


def main():
    rows = []
    for i in range(1, 241):
        url = f"{BASE_URL}{i}"
        try:
            page_html = fetch_page(url)
            parsed = parse_food_page(page_html, i)
            if parsed:
                rows.append(
                    (
                        parsed["food_name"],
                        parsed["calories_kcal"],
                        parsed["carbs_g"],
                        parsed["protein_g"],
                        parsed["fat_g"],
                        parsed["fiber_g"],
                        parsed["sodium_mg"],
                        parsed["potassium_mg"],
                        parsed["sugar_g"],
                        "foodcompositiondb.lk",
                    )
                )
                print(f"  {i}: {parsed['food_name']}")
            else:
                print(f"  {i}: skip (no data)")
        except (HTTPError, URLError, Exception) as e:
            print(f"  {i}: error - {e}")
        time.sleep(0.3)

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "food_name",
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
        )
        w.writerow(
            [
                "# Sri Lankan Food Composition Database (FCDB) - https://www.foodcompositiondb.lk/"
            ]
        )
        w.writerow(
            [
                "# CoTaSS 3 project | 243 ready-to-eat foods | Journal of Food Composition and Analysis (2025)"
            ]
        )
        w.writerow(["# Fetched from /food/1 to /food/240"])
        for r in rows:
            w.writerow(r)

    print(f"\nWrote {len(rows)} foods to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
