# FoodLens Backend

This is the Python-based AI core of the FoodLens ecosystem. It handles image processing, food detection (YOLOv8), nutritional calculations, and AI-driven health advice.

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Environment Variables**:
   Create a `.env` file in this directory:
   ```env
   OPENAI_API_KEY=your_key
   API_HOST=0.0.0.0
   API_PORT=8000
   ```
3. **Run Server**:
   ```bash
   python server.py
   ```

## 🧠 ML Architecture

- **Primary Model**: YOLOv8 Classification (`ml/models/best.pt`) - Trained on 45+ Sri Lankan foods.
- **Detection Model**: YOLOv8 Detection (`ml/models/best_copy.pt`) - Identifies individual items on plates.
- **Fallback**: OpenAI GPT-4 Vision Integration for edge cases and nutrition estimation.

## 📡 API Endpoints

- `POST /predict`: Standard food identification.
- `POST /scan`: Detailed plate analysis (bounding boxes).
- `GET /nutrition`: Fetch data for a specific food.
- `GET /foods`: List all recognized food categories.

For more details, see the [Main Project README](../README.md).
