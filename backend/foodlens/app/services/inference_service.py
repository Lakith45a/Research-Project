from fastapi import UploadFile

from app.domain.constants import (
    DETECTION_IGNORE,
    DETECTION_MIN_CONF,
    MIN_CONFIDENCE_THRESHOLD,
    LOW_CONFIDENCE_FLOOR,
)
from app.services.image_service import (
    open_and_normalize_image,
    draw_bounding_boxes,
    image_to_base64,
)
from app.services.model_registry import get_models
from app.services.nutrition_service import fetch_nutrition, generate_health_advice
from app.services.openai_service import (
    estimate_nutrition_with_openai,
    is_openai_enabled,
    identify_plate_items,
    validate_food_image_and_identify,
    validate_or_correct_food_name,
)
from app.services.response_builders import (
    no_image_response,
    invalid_image_response,
    no_food_detected_response,
    low_confidence_food_response,
    unrecognizable_food_response,
    single_food_response,
    missing_nutrition_response,
    plate_response,
)


def _nutrition_with_fallback(food_name: str):
    """Try DB first; if no match, try OpenAI to estimate nutrition. Used when we have no value in DB."""
    nutrition = fetch_nutrition(food_name)
    if nutrition is not None:
        return nutrition, "database"
    print(f"DB miss for '{food_name}' — trying OpenAI nutrition estimate...")
    estimated = estimate_nutrition_with_openai(food_name)
    if estimated is not None:
        print(f"Using OpenAI estimated nutrition for '{food_name}'")
        return estimated, "openai_estimated"
    print(f"No nutrition from DB or OpenAI for '{food_name}'")
    return None, None


def _openai_validate_is_food(image):
    """
    Validate with OpenAI that the image shows food.
    Returns True if OpenAI says food, False if not food, None if OpenAI not used (disabled or error).
    """
    if not is_openai_enabled():
        return None
    result = validate_food_image_and_identify(image)
    if result is None:
        return None
    return bool(result.get("is_food"))


def _is_meal_description(name: str) -> bool:
    """True if name describes a whole meal (e.g. 'Rice and Curry') not a single item."""
    if not name or len(name) > 60:
        return False
    lower = name.lower()
    return (" and " in lower or " with " in lower or " plate" in lower or " meal" in lower)


def _normalize_food_name(name: str) -> str:
    """Lowercase, strip, collapse spaces for dedup."""
    return " ".join((name or "").strip().lower().split())


def _merge_plate_items(yolo_foods: list, openai_items: list) -> list:
    """
    Merge YOLO and ChatGPT plate items, removing duplicates (same name after normalize).
    Prefer YOLO's name/count/confidence when both have the item; add OpenAI-only items.
    """
    merged = []
    seen_norm = set()
    # Add all YOLO items first (keep their count, confidence, area)
    for f in yolo_foods:
        norm = _normalize_food_name(f["name"])
        if norm not in seen_norm:
            seen_norm.add(norm)
            merged.append(dict(f))
    # Add OpenAI items not already present
    for it in (openai_items or []):
        name = (it.get("name") or it) if isinstance(it, dict) else str(it)
        name = name.strip()
        if not name:
            continue
        norm = _normalize_food_name(name)
        if norm not in seen_norm:
            seen_norm.add(norm)
            merged.append({
                "name": name,
                "count": 1,
                "confidence": 75.0,
                "area_percentage": 0,
            })
    return merged


def _openai_validate_plate_and_identify(image, yolo_detected_foods):
    """
    Validate YOLO plate with OpenAI. If OpenAI says the image is a single food (e.g. Bun)
    and YOLO said multiple items, prefer OpenAI and return that single food name.
    Do NOT override when OpenAI gives a meal description like "Rice and Curry".
    Returns: (use_plate_as_is: bool, openai_single_food_name: str|None)
    """
    if not is_openai_enabled() or not yolo_detected_foods:
        return True, None
    result = validate_food_image_and_identify(image)
    if result is None:
        return True, None
    if not result.get("is_food"):
        return False, None  # not food -> caller will return no_food_detected
    openai_name = (result.get("food_name") or "").strip()
    if not openai_name:
        return True, None
    # Don't override when OpenAI describes the whole meal (e.g. "Rice and Curry")
    if _is_meal_description(openai_name):
        return True, None
    yolo_names = {f["name"].strip().lower() for f in yolo_detected_foods}
    openai_lower = openai_name.lower()
    # OpenAI says one thing, YOLO said 2+ different things -> trust OpenAI (e.g. "Bun" vs "Dhal Curry", "Fish Curry")
    if len(yolo_detected_foods) >= 2 and openai_lower not in yolo_names:
        if "," not in openai_name and len(openai_name.split()) <= 4:
            print(f"OpenAI disagrees with YOLO plate: OpenAI says single food '{openai_name}', YOLO had {list(yolo_names)} — using OpenAI")
            return False, openai_name
    return True, None


async def process_image(file: UploadFile):
    image_data = await file.read()
    if not image_data or len(image_data) < 100:
        print(f"ERROR: Received empty or too-small file ({len(image_data)} bytes). Image was NOT passed correctly.")
        return no_image_response(len(image_data))

    print(f"Image data received: {len(image_data):,} bytes ({file.filename}, content-type: {file.content_type})")

    try:
        image = open_and_normalize_image(image_data)
    except Exception as e:
        print(f"ERROR: Could not decode image — {e}")
        return invalid_image_response(len(image_data), e)

    img_width, img_height = image.size
    print(f"Image dimensions: {img_width}x{img_height}px")
    img_area = img_width * img_height

    model1, model2 = get_models()

    detected_foods = []
    classification_result = None
    all_boxes_for_drawing = []
    model_names = {}
    annotated_image_base64 = None

    if model2:
        try:
            results2 = model2(image, conf=0.15)
            if results2 and len(results2[0].boxes) > 0:
                result2 = results2[0]
                model_names = result2.names
                food_data = {}

                for box in result2.boxes:
                    cls_id = int(box.cls[0])
                    food_name = result2.names[cls_id]
                    if food_name in DETECTION_IGNORE:
                        print(f"Skipping garbage class: {food_name}")
                        continue

                    conf = float(box.conf[0])
                    if conf < DETECTION_MIN_CONF:
                        print(
                            f"Skipping low-confidence detection: {food_name} ({conf*100:.1f}%) — likely non-food (e.g. face)"
                        )
                        continue

                    conf_pct = conf * 100
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    bbox_width = x2 - x1
                    bbox_height = y2 - y1
                    box_area = bbox_width * bbox_height
                    area_percentage = (box_area / img_area) * 100

                    if food_name not in food_data:
                        food_data[food_name] = {
                            "count": 0,
                            "total_conf": 0,
                            "total_area": 0,
                            "total_width": 0,
                            "total_height": 0,
                            "boxes": [],
                            "cls_id": cls_id,
                        }

                    food_data[food_name]["count"] += 1
                    food_data[food_name]["total_conf"] += conf_pct
                    food_data[food_name]["total_area"] += area_percentage
                    food_data[food_name]["total_width"] += bbox_width
                    food_data[food_name]["total_height"] += bbox_height
                    food_data[food_name]["boxes"].append(
                        {
                            "area_pct": area_percentage,
                            "width": bbox_width,
                            "height": bbox_height,
                            "conf": conf_pct,
                            "coords": (x1, y1, x2, y2),
                        }
                    )

                for food_name, data in food_data.items():
                    avg_conf = data["total_conf"] / data["count"]
                    total_area = data["total_area"]
                    detected_foods.append(
                        {
                            "name": food_name,
                            "count": data["count"],
                            "confidence": avg_conf,
                            "area_percentage": round(total_area, 1),
                        }
                    )

                    for box_info in data["boxes"]:
                        all_boxes_for_drawing.append(
                            {
                                "cls_id": data["cls_id"],
                                "conf": box_info["conf"],
                                "coords": box_info["coords"],
                            }
                        )
                    print(f"Detected: {food_name} - Area: {total_area:.1f}%")

                if all_boxes_for_drawing:
                    annotated_image = draw_bounding_boxes(image, all_boxes_for_drawing, model_names)
                    annotated_image_base64 = image_to_base64(annotated_image)
                    print(f"Generated annotated image with {len(all_boxes_for_drawing)} bounding boxes")
            elif results2 and results2[0].probs:
                result2 = results2[0]
                top_index2 = result2.probs.top1
                name2 = result2.names[top_index2]
                conf2 = float(result2.probs.top1conf) * 100
                if conf2 >= 20:
                    classification_result = {"name": name2, "confidence": conf2, "source": "model2"}
                    print(f"Model 2 (classification): {name2} ({conf2:.1f}%)")
                else:
                    print(f"Model 2 (classification) skipped — low confidence {conf2:.1f}% (likely non-food)")
        except Exception as e:
            print(f"Model 2 error: {e}")

    if model1 and not detected_foods:
        try:
            results1 = model1(image, conf=0.01)
            if results1 and results1[0].probs:
                result1 = results1[0]
                top_index1 = result1.probs.top1
                name1 = result1.names[top_index1]
                conf1 = float(result1.probs.top1conf) * 100
                if conf1 >= 20:
                    classification_result = {"name": name1, "confidence": conf1, "source": "model1"}
                    print(f"Model 1 (classification): {name1} ({conf1:.1f}%)")
                else:
                    print(f"Model 1 (classification) skipped — low confidence {conf1:.1f}% (likely non-food)")
        except Exception as e:
            print(f"Model 1 error: {e}")

    if detected_foods:
        print(f"Food plate detected with {len(detected_foods)} different items (YOLO)!")
        # Get ChatGPT's item list for rice-and-curry-style plates; merge with YOLO and remove duplications
        if is_openai_enabled():
            plate_result = identify_plate_items(image)
            if plate_result and plate_result.get("items"):
                items = plate_result["items"]
                if len(items) >= 2:
                    # ChatGPT listed multiple items — merge with YOLO, deduplicate
                    merged = _merge_plate_items(detected_foods, items)
                    if len(merged) != len(detected_foods) or any(
                        _normalize_food_name(m["name"]) != _normalize_food_name(d["name"])
                        for m, d in zip(merged, detected_foods)
                    ):
                        print(f"Merged YOLO + ChatGPT plate items: {[f['name'] for f in merged]} (removed duplications)")
                    detected_foods = merged
                # else: ChatGPT returned 1 item (e.g. "Rice and Curry") — keep YOLO's itemized list
        food_details = []
        foods_without_data = []
        estimated_count = 0
        for food in detected_foods:
            nutrition_per_100g = fetch_nutrition(food["name"])
            if nutrition_per_100g is None:
                if estimated_count < 3:
                    nutrition_per_100g = estimate_nutrition_with_openai(food["name"])
                    if nutrition_per_100g is not None:
                        estimated_count += 1
                if nutrition_per_100g is None:
                    foods_without_data.append(food["name"])
            food_details.append(
                {
                    "name": food["name"],
                    "count": food["count"],
                    "confidence": int(food["confidence"]),
                    "nutrition_per_100g": nutrition_per_100g,
                    "nutrition_available": nutrition_per_100g is not None,
                }
            )
        # Validate with OpenAI: if it says single food (e.g. Bun) and we have plate, use OpenAI's answer
        use_plate, openai_single_name = _openai_validate_plate_and_identify(image, detected_foods)
        if not use_plate and openai_single_name is None:
            print("OpenAI validation: image is not food — rejecting plate result")
            return no_food_detected_response()
        if not use_plate and openai_single_name:
            # OpenAI says single food (e.g. Bun), we had plate — use ChatGPT's answer
            nutrition, nutrition_source = _nutrition_with_fallback(openai_single_name)
            if nutrition is None:
                return missing_nutrition_response(
                    food_name=openai_single_name,
                    confidence=75,
                    model_source="openai_validation_override",
                )
            advice = generate_health_advice(nutrition)
            return single_food_response(
                food_name=openai_single_name,
                confidence=75,
                model_source="openai_validation_override",
                nutrition=nutrition,
                advice=advice,
            )
        return plate_response(
            detected_foods=detected_foods,
            food_details=food_details,
            foods_without_data=foods_without_data,
            annotated_image_base64=annotated_image_base64,
        )

    # YOLO did not detect a plate; try OpenAI to identify all items on the plate (e.g. rice and curry)
    if not detected_foods and is_openai_enabled():
        plate_result = identify_plate_items(image)
        if plate_result and plate_result.get("items"):
            items = plate_result["items"]
            if len(items) >= 2:
                # Multiple items: return as plate so user sees all foods
                openai_detected = [
                    {"name": it["name"], "count": 1, "confidence": 75.0, "area_percentage": 0}
                    for it in items
                ]
                food_details = []
                foods_without_data = []
                estimated_count = 0
                for food in openai_detected:
                    nutrition_per_100g = fetch_nutrition(food["name"])
                    if nutrition_per_100g is None:
                        if estimated_count < 5:
                            nutrition_per_100g = estimate_nutrition_with_openai(food["name"])
                            if nutrition_per_100g is not None:
                                estimated_count += 1
                        if nutrition_per_100g is None:
                            foods_without_data.append(food["name"])
                    food_details.append(
                        {
                            "name": food["name"],
                            "count": food["count"],
                            "confidence": int(food["confidence"]),
                            "nutrition_per_100g": nutrition_per_100g,
                            "nutrition_available": nutrition_per_100g is not None,
                        }
                    )
                print(f"OpenAI plate: identified {len(openai_detected)} items — {[f['name'] for f in openai_detected]}")
                return plate_response(
                    detected_foods=openai_detected,
                    food_details=food_details,
                    foods_without_data=foods_without_data,
                    annotated_image_base64=None,
                )
            if len(items) == 1:
                # Single item from plate API: use as recovered name and fall through to single-food flow below
                classification_result = {"name": items[0]["name"], "confidence": 75.0, "source": "openai_plate"}
                print(f"OpenAI plate: single item — {items[0]['name']}")

    if not classification_result:
        if not is_openai_enabled():
            print("IDENTIFICATION: no model result; OPENAI_IDENTIFICATION: skipped (OPENAI_API_KEY not set)")
            return no_food_detected_response()
        openai_check = validate_food_image_and_identify(image)
        if openai_check and openai_check.get("is_food") and openai_check.get("food_name"):
            recovered_name = openai_check["food_name"]
            print(f"IDENTIFICATION: no model result; OPENAI_IDENTIFICATION: food_name={recovered_name}")
            # Always validate/correct final identified name as a second check
            final_check = validate_or_correct_food_name(image, recovered_name)
            if final_check is not None:
                if not final_check.get("is_food"):
                    print(
                        f"OPENAI_VALIDATION: second check rejected recovered food name '{recovered_name}' as non-food"
                    )
                    return no_food_detected_response()
                final_name = (final_check.get("food_name") or recovered_name).strip()
                if final_name != recovered_name:
                    print(f"OPENAI_VALIDATION: second check corrected '{recovered_name}' -> '{final_name}'")
                    recovered_name = final_name
                else:
                    print(f"OPENAI_VALIDATION: second check confirmed food_name={recovered_name}")
            else:
                print("OPENAI_VALIDATION: second check skipped (API error); using recovered name")
            nutrition, nutrition_source = _nutrition_with_fallback(recovered_name)
            if nutrition is None:
                return missing_nutrition_response(
                    food_name=recovered_name,
                    confidence=75,
                    model_source="openai_validation",
                )
            advice = generate_health_advice(nutrition)
            return single_food_response(
                food_name=recovered_name,
                confidence=75,
                model_source="openai_validation",
                nutrition=nutrition,
                advice=advice,
            )
        print("IDENTIFICATION: no model result; OPENAI_IDENTIFICATION: not food or API error")
        return no_food_detected_response()

    food_name = classification_result["name"]
    confidence = classification_result["confidence"]
    source = classification_result.get("source", "classification_model")
    print(f"IDENTIFICATION: model_suggested={food_name} (source={source}, conf={confidence:.1f}%)")

    # When model gave a single label, check if image is actually a plate with multiple items (e.g. rice and curry)
    if is_openai_enabled() and source != "openai_plate":
        plate_result = identify_plate_items(image)
        if plate_result and plate_result.get("items") and len(plate_result["items"]) >= 2:
            items = plate_result["items"]
            openai_detected = [
                {"name": it["name"], "count": 1, "confidence": int(confidence), "area_percentage": 0}
                for it in items
            ]
            food_details = []
            foods_without_data = []
            estimated_count = 0
            for food in openai_detected:
                nutrition_per_100g = fetch_nutrition(food["name"])
                if nutrition_per_100g is None:
                    if estimated_count < 5:
                        nutrition_per_100g = estimate_nutrition_with_openai(food["name"])
                        if nutrition_per_100g is not None:
                            estimated_count += 1
                    if nutrition_per_100g is None:
                        foods_without_data.append(food["name"])
                food_details.append(
                    {
                        "name": food["name"],
                        "count": food["count"],
                        "confidence": food["confidence"],
                        "nutrition_per_100g": nutrition_per_100g,
                        "nutrition_available": nutrition_per_100g is not None,
                    }
                )
            print(f"OpenAI plate (from single label): identified {len(items)} items — {[f['name'] for f in openai_detected]}")
            return plate_response(
                detected_foods=openai_detected,
                food_details=food_details,
                foods_without_data=foods_without_data,
                annotated_image_base64=None,
            )

    # Validate/correct model identification with OpenAI when enabled (skip if name already from OpenAI plate)
    if is_openai_enabled() and source != "openai_plate":
        openai_validation = validate_or_correct_food_name(image, food_name)
        if openai_validation is not None:
            if not openai_validation.get("is_food"):
                print(f"OPENAI_VALIDATION: image is not food — rejecting model result (model had suggested: {food_name})")
                return no_food_detected_response()
            corrected = openai_validation.get("food_name") or food_name
            if corrected.strip() != food_name.strip():
                print(f"OPENAI_VALIDATION: corrected food name: \"{food_name}\" -> \"{corrected}\"")
                food_name = corrected.strip()
            else:
                print(f"OPENAI_VALIDATION: confirmed food_name={food_name}")
        else:
            print("OPENAI_VALIDATION: skipped (API error or disabled); using model result")
    else:
        print("OPENAI_VALIDATION: skipped (OPENAI_API_KEY not set — add it in backend/.env and restart server)")

    print(f"Final result: {food_name} ({confidence:.1f}%)")

    if confidence < MIN_CONFIDENCE_THRESHOLD:
        if confidence >= LOW_CONFIDENCE_FLOOR:
            print(f"Low confidence — using YOLO best-guess: {food_name} ({confidence:.1f}%)")
            # Validate/correct with OpenAI when enabled
            if is_openai_enabled():
                openai_validation = validate_or_correct_food_name(image, food_name)
                if openai_validation is not None:
                    if not openai_validation.get("is_food"):
                        print(f"OPENAI_VALIDATION: image is not food — rejecting low-conf result (model had: {food_name})")
                        return no_food_detected_response()
                    corrected = openai_validation.get("food_name") or food_name
                    if corrected.strip() != food_name.strip():
                        print(f"OPENAI_VALIDATION: low_conf corrected: \"{food_name}\" -> \"{corrected}\"")
                        food_name = corrected.strip()
                else:
                    print("OPENAI_VALIDATION: skipped (API error); using model result")
            else:
                print("OPENAI_VALIDATION: skipped (OPENAI_API_KEY not set)")
            nutrition, nutrition_source = _nutrition_with_fallback(food_name)
            advice = generate_health_advice(nutrition) if nutrition else []
            return low_confidence_food_response(food_name, confidence, nutrition, advice)
        openai_check = validate_food_image_and_identify(image)
        if openai_check and openai_check.get("is_food") and openai_check.get("food_name"):
            recovered_name = openai_check["food_name"]
            print(f"IDENTIFICATION: low_confidence_model={food_name}; OPENAI_VALIDATION: food_name={recovered_name}")
            nutrition, nutrition_source = _nutrition_with_fallback(recovered_name)
            if nutrition is None:
                return missing_nutrition_response(
                    food_name=recovered_name,
                    confidence=70,
                    model_source="openai_validation_lowconf",
                )
            advice = generate_health_advice(nutrition)
            return single_food_response(
                food_name=recovered_name,
                confidence=70,
                model_source="openai_validation_lowconf",
                nutrition=nutrition,
                advice=advice,
            )
        return unrecognizable_food_response(food_name, confidence)

    nutrition, nutrition_source = _nutrition_with_fallback(food_name)
    print(f"Nutrition: {nutrition}")
    if nutrition is None:
        print(f"❌ No nutrition data available for: {food_name}")
        return missing_nutrition_response(
            food_name=food_name,
            confidence=confidence,
            model_source=classification_result.get("source", "classification_model"),
        )

    advice = generate_health_advice(nutrition)
    print(f"Advice: {advice}")
    model_source = classification_result.get("source", "classification_model")
    if nutrition_source == "openai_estimated":
        model_source = f"{model_source}_openai_nutrition"
    return single_food_response(
        food_name=food_name,
        confidence=confidence,
        model_source=model_source,
        nutrition=nutrition,
        advice=advice,
    )
