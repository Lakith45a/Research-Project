import base64
import io
from typing import List, Dict

from PIL import Image, ImageOps, ImageDraw, ImageFont

from app.domain.constants import BBOX_COLORS


def open_and_normalize_image(image_data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(image_data))
    return ImageOps.exif_transpose(image)


def image_to_base64(image: Image.Image) -> str:
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG", quality=85)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/jpeg;base64,{img_str}"


def draw_bounding_boxes(image: Image.Image, boxes_data: List[dict], names: Dict[int, str]) -> Image.Image:
    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)

    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except Exception:
        font = ImageFont.load_default()

    color_map: Dict[str, tuple] = {}
    color_idx = 0

    for box_info in boxes_data:
        cls_id = box_info["cls_id"]
        food_name = names[cls_id]
        x1, y1, x2, y2 = box_info["coords"]

        if food_name not in color_map:
            color_map[food_name] = BBOX_COLORS[color_idx % len(BBOX_COLORS)]
            color_idx += 1
        color = color_map[food_name]

        draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
        label = f"{food_name}"
        bbox = draw.textbbox((0, 0), label, font=font)
        label_width = bbox[2] - bbox[0]
        label_height = bbox[3] - bbox[1]
        label_y = max(y1 - label_height - 8, 0)

        draw.rectangle(
            [x1, label_y, x1 + label_width + 8, label_y + label_height + 6],
            fill=color,
        )
        draw.text((x1 + 4, label_y + 2), label, fill=(255, 255, 255), font=font)

    return annotated
