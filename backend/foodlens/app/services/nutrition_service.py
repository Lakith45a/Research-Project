from src.nutrition_engine import get_nutrition_info, get_all_food_names

from app.domain.constants import TRAINED_FOODS


def fetch_nutrition(food_name: str):
    return get_nutrition_info(food_name)


def list_food_names():
    """Return all food names for search: CSV database + TRAINED_FOODS, deduplicated and sorted."""
    try:
        csv_names = get_all_food_names()
        combined = list(dict.fromkeys((csv_names or []) + TRAINED_FOODS))
        combined.sort(key=str.lower)
        return {"foods": combined}
    except Exception as e:
        print(f"/foods error: {e}")
    return {"foods": TRAINED_FOODS}


def get_nutrition_by_name_response(name: str):
    nutrition = get_nutrition_info(name)
    if nutrition is None:
        return {
            "name": name,
            "nutrition": None,
            "nutrition_available": False,
            "source": "database",
            "tips": [],
            "error": f"Sorry, nutrition data for '{name}' is not available in our database.",
        }
    return {
        "name": name,
        "nutrition": nutrition,
        "nutrition_available": True,
        "source": "database",
        "tips": [],
    }


def generate_health_advice(nutrition: dict) -> list:
    advice = []

    sodium = nutrition.get("sodium", 0)
    if sodium > 600:
        advice.append(
            {
                "type": "warning",
                "icon": "⚠️",
                "text": "Very high sodium. May increase blood pressure. Limit intake if you have hypertension.",
            }
        )
    elif sodium > 400:
        advice.append(
            {
                "type": "caution",
                "icon": "🧂",
                "text": "Moderate-high sodium. Consider limiting other salty foods today.",
            }
        )
    elif sodium < 100:
        advice.append(
            {
                "type": "good",
                "icon": "✅",
                "text": "Low sodium content - good for heart health!",
            }
        )

    sugar = nutrition.get("sugar", 0)
    if sugar > 30:
        advice.append(
            {
                "type": "warning",
                "icon": "⚠️",
                "text": "Very high sugar. May spike blood sugar levels. Not recommended for diabetics.",
            }
        )
    elif sugar > 15:
        advice.append(
            {
                "type": "caution",
                "icon": "🍬",
                "text": "High sugar content. Monitor your daily sugar intake.",
            }
        )
    elif sugar < 5:
        advice.append(
            {
                "type": "good",
                "icon": "✅",
                "text": "Low sugar - good for blood sugar control!",
            }
        )

    fat = nutrition.get("fat", 0)
    if fat > 20:
        advice.append(
            {"type": "warning", "icon": "⚠️", "text": "High fat content. Consume in moderation."}
        )
    elif fat > 15:
        advice.append(
            {"type": "caution", "icon": "🍳", "text": "Moderate-high fat. Balance with low-fat meals."}
        )

    fiber = nutrition.get("fiber", 0)
    if fiber >= 3:
        advice.append({"type": "good", "icon": "🥬", "text": "Good fiber content - aids digestion!"})

    protein = nutrition.get("protein", 0)
    if protein >= 10:
        advice.append({"type": "good", "icon": "💪", "text": "Good protein source - helps muscle health!"})

    potassium = nutrition.get("potassium", 0)
    if potassium >= 200:
        advice.append({"type": "good", "icon": "❤️", "text": "Good potassium - supports heart function!"})

    calories = nutrition.get("calories", 0)
    if calories > 350:
        advice.append({"type": "caution", "icon": "🔥", "text": "High calorie. Consider portion control."})

    if not advice:
        advice.append({"type": "info", "icon": "ℹ️", "text": "Enjoy in moderation as part of a balanced diet."})

    return advice
