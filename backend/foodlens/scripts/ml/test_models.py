"""
Test that both YOLO models (best.pt = classification, best_copy.pt = detection) load and run.
Run from backend folder: python scripts/ml/test_models.py
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BACKEND_DIR, "models")
ML_MODELS_DIR = os.path.join(BACKEND_DIR, "ml", "models")
os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)


def _model_path(*names):
    for name in names:
        for base in (ML_MODELS_DIR, MODELS_DIR, BACKEND_DIR):
            p = os.path.join(base, name)
            if os.path.isfile(p):
                return p
    return None


def main():
    from ultralytics import YOLO
    import numpy as np

    print("=" * 60)
    print("Testing YOLO models")
    print("=" * 60)

    path1 = _model_path("best.pt")
    if not path1:
        print("FAIL: Model 1 - best.pt not found in backend/ml/models/ (or legacy locations)")
        return 1
    try:
        model1 = YOLO(path1)
        print("OK: Model 1 (classification) loaded:", os.path.basename(path1))
        print("    Classes:", model1.names)
    except Exception as e:
        print("FAIL: Model 1 load error:", e)
        return 1

    path2 = _model_path("best_copy.pt", "best copy.pt")
    if not path2:
        print("FAIL: Model 2 - best_copy.pt / best copy.pt not found in backend/ml/models/ (or legacy locations)")
        return 1
    try:
        model2 = YOLO(path2)
        print("OK: Model 2 (detection) loaded:", os.path.basename(path2))
        print("    Classes:", model2.names)
    except Exception as e:
        print("FAIL: Model 2 load error:", e)
        return 1

    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    dummy[:] = (220, 220, 220)

    try:
        results1 = model1(dummy, conf=0.01, verbose=False)
        print("OK: Model 1 inference ran (classification)")
        if results1 and len(results1) > 0:
            r = results1[0]
            if hasattr(r, "probs") and r.probs is not None:
                top1 = r.probs.top1
                names = getattr(r.probs, "names", model1.names)
                name = names[top1] if names else str(top1)
                print("    Top class:", name, "(conf:", f"{r.probs.top1conf:.2f})")
    except Exception as e:
        print("FAIL: Model 1 inference error:", e)
        return 1

    try:
        results2 = model2(dummy, conf=0.15, verbose=False)
        print("OK: Model 2 inference ran (detection)")
        if results2 and len(results2) > 0:
            r = results2[0]
            boxes = getattr(r, "boxes", None)
            n = len(boxes) if boxes is not None else 0
            print("    Detections on dummy image:", n, "(0 is OK for blank image)")
    except Exception as e:
        print("FAIL: Model 2 inference error:", e)
        return 1

    print("=" * 60)
    print("Both models load and run correctly.")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
