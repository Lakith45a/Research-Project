import glob
import os

import requests

url = "http://127.0.0.1:5001/scan"
MANUAL_IMAGE_PATH = "test_image.jpg"


def find_test_image():
    if MANUAL_IMAGE_PATH and os.path.exists(MANUAL_IMAGE_PATH):
        print(f"Using Manual Image: {MANUAL_IMAGE_PATH}")
        return MANUAL_IMAGE_PATH

    search_patterns = [
        "sl_food_data_final/train/*/*.jpg",
        "food_dataset/train/images/*.jpg",
        "sl_food_data/train/*/*.jpg",
        "**/*.jpg",
    ]

    print("Searching for a test image (Auto-Detect)...")
    for pattern in search_patterns:
        files = glob.glob(pattern, recursive=True)
        valid_files = [f for f in files if "temp_upload" not in f]
        if valid_files:
            return valid_files[0]
    return None


found_image = find_test_image()
if found_image:
    image_path = found_image
    print(f"Selected image: {image_path}")
else:
    image_path = MANUAL_IMAGE_PATH

if not os.path.exists(image_path):
    print(f"Error: Could not find image at: {image_path}")
else:
    try:
        with open(image_path, "rb") as img:
            print(f"Sending to server at {url}...")
            files = {"image": img}
            response = requests.post(url, files=files)

            print("\nSERVER RESPONSE:")
            try:
                print(response.json())
            except requests.exceptions.JSONDecodeError:
                print("Response was not JSON. Raw text:", response.text)
    except requests.exceptions.ConnectionError:
        print("\nConnection Error: Is the server running?")
        print("Make sure to run 'python server.py' in a separate terminal first.")
