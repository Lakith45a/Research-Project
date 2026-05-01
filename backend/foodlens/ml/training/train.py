import os

from ultralytics import YOLO


def train():
    training_dir = os.path.dirname(os.path.abspath(__file__))
    ml_dir = os.path.dirname(training_dir)
    backend_dir = os.path.dirname(ml_dir)

    base_model_path = os.path.join(ml_dir, "models", "yolov8n-cls.pt")
    if not os.path.isfile(base_model_path):
        # Backward fallback for older local setups.
        base_model_path = os.path.join(backend_dir, "yolov8n-cls.pt")

    dataset_path = os.path.join(backend_dir, "sl_food_data_final")
    project_path = os.path.join(backend_dir, "sl_food_models")

    model = YOLO(base_model_path)
    print("Starting Training... (This might take 1-2 hours on a laptop CPU)")

    model.train(
        data=dataset_path,
        epochs=3,
        imgsz=224,
        project=project_path,
        name="laptop_run",
    )

    print("Training Finished!")


if __name__ == "__main__":
    train()
