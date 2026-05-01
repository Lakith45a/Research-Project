import base64
import io
import json
import re
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image

from app.core.config import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_API_URL, OPENAI_TIMEOUT_SEC


def is_openai_enabled() -> bool:
    return bool(OPENAI_API_KEY)


def _image_to_data_url(image: Image.Image) -> str:
    img = image if image.mode == "RGB" else image.convert("RGB")
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=90)
    b64 = base64.b64encode(buffered.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def _extract_json_object(text: str) -> Optional[dict]:
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def _post_chat_completion(messages: list, temperature: float = 0.0, max_tokens: int = 300) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None

    payload = {
        "model": OPENAI_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    data = json.dumps(payload).encode("utf-8")
    req = Request(
        OPENAI_API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=OPENAI_TIMEOUT_SEC) as resp:
            body = resp.read().decode("utf-8", errors="replace")
        parsed = json.loads(body)
        return parsed["choices"][0]["message"]["content"]
    except (HTTPError, URLError, TimeoutError, KeyError, ValueError) as e:
        print(f"OpenAI API error: {e}")
        return None


# Instruction so OpenAI prefers Sri Lankan food names and also recognizes simple/common foods
_SRI_LANKAN_FOOD_CONTEXT = (
    "This app is for Sri Lankan and common foods. When the image shows food, prefer Sri Lankan dish names "
    "where applicable (e.g. rice and curry, string hoppers, hoppers, kottu roti, dhal curry, "
    "pol sambol, mallum, parippu, brinjal curry, fish curry). "
    "Also recognize simple single-item foods with clear names: buns (Bun, Chicken Bun), bread (White Bread, Brown Bread), "
    "rolls, pastries, snacks, cutlets, noodles, pizza, drinks. Use short, specific English names (e.g. 'Bun' not 'bread product')."
)


def validate_food_image_and_identify(image: Image.Image) -> Optional[dict]:
    """
    Validate whether image contains food and return identified food name if possible.
    Returns: {"is_food": bool, "food_name": str|None, "confidence_note": str}
    """
    if not is_openai_enabled():
        return None

    image_data_url = _image_to_data_url(image)
    prompt = (
        "You are validating food images for a nutrition app.\n"
        + _SRI_LANKAN_FOOD_CONTEXT
        + "\n\n"
        "Return ONLY valid JSON with this exact shape:\n"
        '{"is_food": true, "food_name": "string_or_null", "confidence_note": "short note"}\n'
        "Rules:\n"
        "- is_food=false for faces/selfies/people/pets/documents/objects/non-food scenes.\n"
        "- If is_food=true, provide the best food_name. This includes full meals (rice and curry) AND simple single items "
        "(e.g. a bun → \"Bun\" or \"Chicken Bun\", bread → \"White Bread\", roll, pastry, cutlet, noodles). Always give a specific name.\n"
        "- If uncertain, still choose the most likely food_name and explain in confidence_note."
    )

    content = _post_chat_completion(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        temperature=0.0,
        max_tokens=220,
    )
    result = _extract_json_object(content or "")
    if not result:
        print("OpenAI [identify]: no response or parse failed")
        if content:
            print(f"OpenAI [identify] raw (first 200 chars): {repr(content[:200])}")
        return None

    out = {
        "is_food": bool(result.get("is_food", False)),
        "food_name": (result.get("food_name") or None),
        "confidence_note": str(result.get("confidence_note", "")).strip(),
    }
    print(f"OpenAI [identify] output: is_food={out['is_food']}, food_name={out['food_name']!r}, confidence_note={out['confidence_note']!r}")
    return out


def identify_plate_items(image: Image.Image) -> Optional[dict]:
    """
    Identify all food items on a plate/meal image. Use when the image may show multiple items
    (e.g. rice and curry plate). Returns: {"is_plate": bool, "items": [{"name": "Rice"}, {"name": "Dhal curry"}, ...]}
    """
    if not is_openai_enabled():
        return None

    image_data_url = _image_to_data_url(image)
    prompt = (
        "You are identifying food items for a Sri Lankan nutrition app.\n"
        + _SRI_LANKAN_FOOD_CONTEXT
        + "\n\n"
        "Look at the image. If it shows a plate or meal with MULTIPLE distinct food items, list each one. "
        "If it shows a single food item (including a bun, bread, roll, pastry, snack), return one item with a clear name.\n"
        "Return ONLY valid JSON in this exact shape:\n"
        '{"is_plate": true, "items": [{"name": "Rice"}, {"name": "Dhal curry"}, {"name": "Mallum"}]}\n'
        "Rules:\n"
        "- is_plate=true when there are 2 or more distinct foods visible (e.g. rice and curry, rice with dhal and vegetable).\n"
        "- is_plate=false when there is only one food (e.g. a single hopper, one bun, one bread, one pastry, one dish).\n"
        "- items: array with one object per distinct food. Use short names: Sri Lankan dishes (rice, dhal curry, fish curry, pol sambol, mallum); "
        "simple foods (Bun, Chicken Bun, White Bread, Noodles, Pizza, Cutlet, Pastry, Roll).\n"
        "- List every distinct food; do not combine (e.g. \"Rice\" and \"Dhal curry\" not \"Rice and dhal\"). For a single bun or bread, use items: [{\"name\": \"Bun\"}] or [{\"name\": \"Chicken Bun\"}] etc."
    )

    content = _post_chat_completion(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        temperature=0.0,
        max_tokens=320,
    )
    result = _extract_json_object(content or "")
    if not result:
        print("OpenAI [plate_items]: no response or parse failed")
        if content:
            print(f"OpenAI [plate_items] raw (first 200 chars): {repr(content[:200])}")
        return None

    raw_items = result.get("items")
    if not isinstance(raw_items, list):
        raw_items = []
    items = []
    for x in raw_items:
        if isinstance(x, dict) and x.get("name"):
            items.append({"name": str(x.get("name")).strip()})
        elif isinstance(x, str) and x.strip():
            items.append({"name": x.strip()})

    out = {"is_plate": bool(result.get("is_plate", False)), "items": items}
    print(f"OpenAI [plate_items] output: is_plate={out['is_plate']}, items={[i['name'] for i in items]}")
    return out


def validate_or_correct_food_name(image: Image.Image, model_suggested_name: str) -> Optional[dict]:
    """
    Validate/correct the model's food identification using OpenAI.
    Returns: {"is_food": bool, "food_name": str|None, "confidence_note": str}
    - If is_food=false, image is not food (e.g. logo, face).
    - If is_food=true, food_name is the confirmed or corrected name (may equal model_suggested_name).
    """
    if not is_openai_enabled() or not model_suggested_name:
        return None

    image_data_url = _image_to_data_url(image)
    prompt = (
        "You are validating food identification for a nutrition app.\n"
        + _SRI_LANKAN_FOOD_CONTEXT
        + "\n\n"
        f"Our ML model suggested this image shows: \"{model_suggested_name}\".\n"
        "Look at the image and return ONLY valid JSON with this exact shape:\n"
        '{"is_food": true, "food_name": "string_or_null", "confidence_note": "short note"}\n'
        "Rules:\n"
        "- is_food=false if the image is NOT food (e.g. logo, icon, face, document, object).\n"
        "- If is_food=true, set food_name to the actual food. If the model suggestion is wrong, "
        "correct it and put the right name in food_name — we will use your output.\n"
        "- Prefer Sri Lankan dish names when the food is Sri Lankan. For simple items use clear names: Bun, Chicken Bun, White Bread, Roll, Pastry, Noodles, Pizza, Cutlet, etc."
    )

    content = _post_chat_completion(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        temperature=0.0,
        max_tokens=220,
    )
    result = _extract_json_object(content or "")
    if not result:
        print(f"OpenAI [validate/correct] (model_suggested={model_suggested_name!r}): no response or parse failed")
        if content:
            print(f"OpenAI [validate/correct] raw (first 200 chars): {repr(content[:200])}")
        return None

    out = {
        "is_food": bool(result.get("is_food", False)),
        "food_name": (result.get("food_name") or None),
        "confidence_note": str(result.get("confidence_note", "")).strip(),
    }
    print(f"OpenAI [validate/correct] output: is_food={out['is_food']}, food_name={out['food_name']!r}, confidence_note={out['confidence_note']!r}")
    return out


def estimate_nutrition_with_openai(food_name: str) -> Optional[dict]:
    """
    Return estimated per-100g nutrition with the same keys used by frontend/backend.
    """
    if not is_openai_enabled() or not food_name:
        return None

    prompt = (
        f"Estimate realistic nutrition values per 100g for this food: {food_name}.\n"
        "Treat it as a Sri Lankan dish when that fits (e.g. rice and curry, hoppers, kottu, dhal).\n"
        "Return ONLY valid JSON with numeric values in this exact shape:\n"
        '{"calories": 0, "carbs": 0, "protein": 0, "fat": 0, "fiber": 0, "sodium": 0, "potassium": 0, "sugar": 0}\n'
        "Use common food composition references and avoid extreme values."
    )

    content = _post_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=220,
    )
    result = _extract_json_object(content or "")
    if not result:
        print(f"OpenAI [nutrition] (food={food_name!r}): no response or parse failed")
        if content:
            print(f"OpenAI [nutrition] raw (first 200 chars): {repr(content[:200])}")
        return None

    def _num(key: str) -> float:
        try:
            value = float(result.get(key, 0))
            return max(value, 0.0)
        except Exception:
            return 0.0

    nutrition = {
        "calories": round(_num("calories"), 2),
        "carbs": round(_num("carbs"), 2),
        "protein": round(_num("protein"), 2),
        "fat": round(_num("fat"), 2),
        "fiber": round(_num("fiber"), 2),
        "sodium": round(_num("sodium"), 2),
        "potassium": round(_num("potassium"), 2),
        "sugar": round(_num("sugar"), 2),
        "data_source": "openai_estimated",
    }
    print(f"OpenAI [nutrition] output: food={food_name!r} -> cal={nutrition['calories']} carbs={nutrition['carbs']} protein={nutrition['protein']} fat={nutrition['fat']} sodium={nutrition['sodium']}")
    return nutrition
