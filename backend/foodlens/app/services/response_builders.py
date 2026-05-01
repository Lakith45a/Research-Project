from app.domain.constants import TRAINED_FOODS


def no_image_response(image_size: int):
    return {
        "name": "No Image",
        "confidence": 0,
        "recognized": False,
        "message": "No image data received by the server. Please check that the image is being uploaded correctly.",
    }


def invalid_image_response(image_size: int, error: Exception):
    return {
        "name": "Invalid Image",
        "confidence": 0,
        "recognized": False,
        "message": f"Received {image_size:,} bytes but could not open as an image: {error}",
    }


def no_food_detected_response():
    return {
        "name": "No Food Detected",
        "confidence": 0,
        "recognized": False,
        "model_source": "none",
        "message": "No food was detected in this image. Please take a photo of your meal or dish (avoid selfies or faces — the app is for food only).",
        "suggestions": TRAINED_FOODS[:10],
    }


def unrecognizable_food_response(food_name: str, confidence: float):
    return {
        "name": food_name,
        "confidence": int(confidence),
        "recognized": False,
        "model_source": "none",
        "message": "This food item could not be recognised. Our model is trained on Sri Lankan foods.",
        "suggestions": TRAINED_FOODS,
        "tip": "Try scanning one of these items for best results!",
    }


def low_confidence_food_response(food_name: str, confidence: float, nutrition, advice):
    return {
        "name": food_name,
        "confidence": int(confidence),
        "recognized": True,
        "model_source": "yolo_lowconf",
        "low_confidence": True,
        "nutrition": nutrition,
        "advice": advice,
        "message": f"Low confidence result ({int(confidence)}%) — verify the food visually.",
    }


def missing_nutrition_response(food_name: str, confidence: float, model_source: str):
    return {
        "name": food_name,
        "confidence": int(confidence),
        "recognized": True,
        "model_source": model_source,
        "nutrition": None,
        "nutrition_available": False,
        "advice": [],
        "message": f"Sorry, nutrition data for '{food_name}' is not available in our database. Please contact support to add this food item.",
    }


def single_food_response(food_name: str, confidence: float, model_source: str, nutrition: dict, advice: list):
    return {
        "name": food_name,
        "confidence": int(confidence),
        "recognized": True,
        "model_source": model_source,
        "nutrition": nutrition,
        "nutrition_available": True,
        "advice": advice,
    }


def plate_response(detected_foods: list, food_details: list, foods_without_data: list, annotated_image_base64: str | None):
    food_names = [f["name"] for f in detected_foods]
    summary_name = ", ".join(food_names)
    avg_confidence = sum(f["confidence"] for f in detected_foods) / len(detected_foods)

    if foods_without_data:
        message = f"Detected {len(detected_foods)} food item(s). ⚠️ Nutrition data not available for: {', '.join(foods_without_data)}"
    else:
        message = f"Detected {len(detected_foods)} food item(s) — enter portions below to calculate nutrition"

    response = {
        "name": summary_name,
        "confidence": int(avg_confidence),
        "recognized": True,
        "is_plate": True,
        "model_source": "detection_model",
        "foods_detected": food_details,
        "total_items": sum(f["count"] for f in detected_foods),
        "nutrition": None,
        "advice": [],
        "message": message,
        "foods_without_nutrition": foods_without_data,
    }
    if annotated_image_base64:
        response["annotated_image"] = annotated_image_base64
    return response
