# YOLO model weights

Preferred location is `backend/ml/models/`.

## Required files

- **best.pt** — Classification model (single food item). Used as "Model 1".
- **best_copy.pt** or **best copy.pt** — Detection model (multiple foods on a plate). Used as "Model 2".

The server now checks in this order:
1. `backend/ml/models/` (new location)
2. `backend/models/` (legacy fallback)
3. `backend/` (legacy fallback)

If no `.pt` files are found, food detection will not work until model files are added.
