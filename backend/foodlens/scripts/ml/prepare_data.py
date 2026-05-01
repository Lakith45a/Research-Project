import os
import shutil
import zipfile

import splitfolders


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)


def _resolve_zip_path():
    candidates = [
        os.path.join(PROJECT_ROOT, "archive.zip"),
        os.path.join(BACKEND_DIR, "archive.zip"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]


def prepare_dataset():
    zip_path = _resolve_zip_path()
    extract_path = os.path.join(PROJECT_ROOT, "raw_data")
    output_path = os.path.join(PROJECT_ROOT, "sl_food_data_final")

    if os.path.exists(extract_path):
        shutil.rmtree(extract_path)
    if os.path.exists(output_path):
        shutil.rmtree(output_path)

    print(f"Unzipping {zip_path}...")
    if not os.path.exists(zip_path):
        print("Error: archive.zip not found.")
        return

    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(extract_path)

    real_root = extract_path
    found = False
    for root, dirs, files in os.walk(extract_path):
        if len(dirs) > 5:
            real_root = root
            found = True
            break

    if found:
        print(f"Found dataset root: {real_root}")
    else:
        print("Warning: Could not auto-detect class folders. Trying raw_data root.")

    print("Splitting data into Train/Val...")
    splitfolders.ratio(real_root, output=output_path, seed=1337, ratio=(0.8, 0.2))

    print("-" * 30)
    print("SUCCESS: Data is ready.")
    print(f"Training data is in: {output_path}{os.sep}train")
    print("-" * 30)


if __name__ == "__main__":
    prepare_dataset()
