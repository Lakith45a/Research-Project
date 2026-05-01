import csv
import os

# Load CSV data once at startup
CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'nutrition_database_complete.csv')
csv_nutrition_data = {}

def load_csv_data():
    """Load complete nutrition data from CSV file"""
    global csv_nutrition_data
    try:
        with open(CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Skip comment lines
                if row['food_name'].startswith('#'):
                    continue
                    
                # Normalize the food name for matching
                food_name = row['food_name'].lower().replace(" ", "").replace(",", "").replace("-", "").replace("(", "").replace(")", "")
                
                csv_nutrition_data[food_name] = {
                    'calories': float(row['calories_kcal']) if row['calories_kcal'] else 0,
                    'carbs': float(row['carbs_g']) if row['carbs_g'] else 0,
                    'protein': float(row['protein_g']) if row['protein_g'] else 0,
                    'fat': float(row['fat_g']) if row['fat_g'] else 0,
                    'fiber': float(row['fiber_g']) if row['fiber_g'] else 0,
                    'sodium': float(row['sodium_mg']) if row['sodium_mg'] else 0,
                    'potassium': float(row['potassium_mg']) if row['potassium_mg'] else 0,
                    'sugar': float(row['sugar_g']) if row['sugar_g'] else 0,
                    'original_name': row['food_name'],
                    'source': row['source'] if 'source' in row else 'unknown'
                }
        print(f"✓ Loaded {len(csv_nutrition_data)} foods from nutrition database")
    except Exception as e:
        print(f"Could not load CSV: {e}")

# Load CSV data on module import
load_csv_data()

def get_all_food_names():
    """Return sorted list of all food names (original display names) from the database."""
    return sorted(set(data["original_name"] for data in csv_nutrition_data.values()))

def find_best_csv_match(search_name):
    """Find the best matching food in CSV data"""
    clean_search = search_name.lower().replace(" ", "").replace("-", "").replace("_", "")
    
    # Direct match
    if clean_search in csv_nutrition_data:
        return csv_nutrition_data[clean_search]
    
    # Partial match - find foods containing the search term
    best_match = None
    best_score = 0
    
    for csv_name, data in csv_nutrition_data.items():
        # Check if search term is in CSV name or vice versa
        if clean_search in csv_name or csv_name in clean_search:
            score = len(clean_search) / max(len(csv_name), len(clean_search))
            if score > best_score:
                best_score = score
                best_match = data
        
        # Check individual words
        search_words = clean_search.replace("curry", " curry ").replace("rice", " rice ").replace("fish", " fish ").split()
        for word in search_words:
            if len(word) > 3 and word in csv_name:
                if best_match is None or data['calories'] > 0:
                    best_match = data
                    break
    
    return best_match

def get_nutrition_info(food_name):
    """
    Get nutrition information for a given food item.
    
    Priority:
    1. First checks nutrition_database_complete.csv for actual data
    2. If not found, returns None to indicate no data available
    
    Returns:
        dict or None: Nutrition data with a 'data_source' field if found,
                      None if food not in database
    """
    # 1. Normalize the name (Make it lowercase & remove spaces)
    clean_name = food_name.lower().replace(" ", "").replace("-", "")

    print(f"Database Lookup: Searching for '{clean_name}' (Original: {food_name})")

    # 2. Try to find in CSV database first (complete nutrition data)
    csv_match = find_best_csv_match(food_name)
    if csv_match:
        nutrition = {
            "calories": round(csv_match['calories'], 2),
            "carbs": round(csv_match['carbs'], 2),
            "protein": round(csv_match['protein'], 2),
            "fat": round(csv_match['fat'], 2),
            "fiber": round(csv_match['fiber'], 2),
            "sodium": round(csv_match['sodium'], 2),
            "potassium": round(csv_match['potassium'], 2),
            "sugar": round(csv_match['sugar'], 2),
            "data_source": "database"  # Actual data from nutrition database
        }
        print(f"✓ CSV Match: {csv_match['original_name']} ({csv_match['source']})")
        return nutrition
    
    # ========================================================================
    # 3. NOT FOUND: Return None to indicate no data available
    # ========================================================================
    print(f"❌ No match found for '{food_name}' in nutrition database")
    return None