import os
from typing import Optional, Tuple

from ultralytics import YOLO

from app.core.config import BACKEND_DIR, MODELS_DIR, ML_MODELS_DIR


def _model_path(*names: str) -> Optional[str]:
    for name in names:
        # Prefer the new ml/models location, then fallback to legacy paths.
        for base in (ML_MODELS_DIR, MODELS_DIR, BACKEND_DIR):
            p = os.path.join(base, name)
            if os.path.isfile(p):
                return p
    return None


def _load_models() -> Tuple[Optional[YOLO], Optional[YOLO]]:
    print("Loading YOLO models...")
    model1: Optional[YOLO] = None
    model2: Optional[YOLO] = None

    path1 = _model_path("best.pt")
    if path1:
        try:
            model1 = YOLO(path1)
            print(f"✓ Model 1 (classification) loaded: {os.path.basename(path1)}")
        except Exception as e:
            print(f"Error loading model 1: {e}")
    else:
        print("  Model 1: best.pt not found. Place it in backend/ml/models/ (or legacy backend/models/).")

    path2 = _model_path("best_copy.pt", "best copy.pt")
    if path2:
        try:
            model2 = YOLO(path2)
            print(f"✓ Model 2 (detection) loaded: {os.path.basename(path2)}")
        except Exception as e:
            print(f"Error loading model 2: {e}")
    else:
        print("  Model 2: best_copy.pt (or best copy.pt) not found. Place it in backend/ml/models/ (or legacy backend/models/).")

    if not model1 and not model2:
        print("No YOLO models loaded. Food detection will not work until models are added.")

    return model1, model2


_MODEL1, _MODEL2 = _load_models()


def get_models() -> Tuple[Optional[YOLO], Optional[YOLO]]:
    return _MODEL1, _MODEL2
