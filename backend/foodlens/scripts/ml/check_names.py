import os

from ultralytics import YOLO


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
model_path = os.path.join(BACKEND_DIR, "ml", "models", "best.pt")
if not os.path.isfile(model_path):
    model_path = os.path.join(BACKEND_DIR, "best.pt")

model = YOLO(model_path)
print("AI Classes:", model.names)
