
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_core.messages import HumanMessage
from agent_graph import build_graph
from langchain_core.messages import AIMessage, HumanMessage
import asyncio
import os
import sys

from hypertension import predict_hypertension
from hypertension_recommondation import hypertension_recommendation_generator
from diabetes import predict_diabetes
from diabetes_recommondation import diabetes_recommendation_generator


FOODLENS_ROOT = os.path.join(os.path.dirname(__file__), "foodlens")
if FOODLENS_ROOT not in sys.path:
    # Put FoodLens root first so `import app...` resolves to `foodlens/app`
    # instead of this file (`backend/app.py`).
    sys.path.insert(0, FOODLENS_ROOT)

try:
    from app.services.inference_service import process_image as foodlens_process_image
    from app.services.nutrition_service import (
        get_nutrition_by_name_response as foodlens_get_nutrition_by_name_response,
        list_food_names as foodlens_list_food_names,
    )
    from app.services.model_registry import get_models as foodlens_get_models
    FOODLENS_AVAILABLE = True
except Exception as foodlens_import_error:
    FOODLENS_AVAILABLE = False
    FOODLENS_IMPORT_ERROR = str(foodlens_import_error)


def _log_foodlens_startup_status():
    print("\n========== FoodLens Startup ==========")
    print(f"FoodLens root: {FOODLENS_ROOT}")

    if not FOODLENS_AVAILABLE:
        print("FoodLens status: FAILED")
        print(f"Reason: {FOODLENS_IMPORT_ERROR}")
        print("Endpoints /predict /scan /nutrition /foods will return 500.")
        print("======================================\n")
        return

    print("FoodLens status: AVAILABLE")
    try:
        model1, model2 = foodlens_get_models()
        print(f"Model 1 (classification): {'LOADED' if model1 else 'NOT LOADED'}")
        print(f"Model 2 (detection): {'LOADED' if model2 else 'NOT LOADED'}")
        if not model1 and not model2:
            print("Warning: no food models loaded, detection will not work.")
    except Exception as e:
        print(f"Model warm-check failed: {e}")
    print("FoodLens endpoints active: /predict, /scan, /nutrition, /foods")
    print("======================================\n")


graph = build_graph()


app = Flask(__name__)
CORS(app)

active_sessions = set()


def get_initial_state(user_query, user_id):
    return {
        "messages": [HumanMessage(content=user_query)],
        "user_id": user_id,
        "topic_counter": 0,
        "actual_answers": [],
        "temporal_answer": None,
        "interact_with_user": True,
        "stress_level": None,
        "recommendations": None,
        "complete_test": False
    }


def build_query(input_data: dict, hypertension_risk: str) -> str:
    query = f"""
A user has the following health details:
hypertension risk status: {hypertension_risk}
Age: {input_data['age']}
Salt intake per day: {input_data['salt']} grams
Blood pressure history: {input_data['bp']}
Sleep duration: {input_data['sleep_hours']} hours
BMI: {input_data['bmi']}
Family history of hypertension: {input_data['family_history']}
Smoking habit: {input_data['smoke']}

Based on these health and lifestyle details, provide recommendations to reduce the risk of hypertension and improve overall blood pressure health.
"""
    return query


def build_query_for_diabetes(data, diabetes_level: str):

    query = f"""
    Patient Health Data:
    - Age: {data['age']}
    - Gender: {data['gender']}
    - Height: {data['height']} cm
    - Weight: {data['weight']} kg
    - Waist Circumference: {data['waist_circumference']}
    - Diet Food Habits Score: {data['diet_food_habits']}
    - Blood Pressure Issue: {data['blood_pressure']}
    - Cholesterol/Lipid Levels Issue: {data['cholesterol_lipid_levels']}
    - Vision Changes: {data['vision_changes']}
    - BMI: {data['bmi']}

    Predicted Diabetes Level: {diabetes_level}

    Based on this information, provide health advice, lifestyle recommendations,
    and preventive tips for managing or reducing diabetes risk.
    """

    return query



@app.route("/chat", methods=["POST"])
def chat():

    data = request.json
    session_id = data.get("session_id")
    user_query = data.get("query")
    user_id = data.get("user_id")

    if not session_id or not user_query or not user_id:
        return jsonify({"error": "session_id, query, and user_id are required"}), 400

    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    try:

        if session_id not in active_sessions:

            result = graph.invoke(
                get_initial_state(user_query, user_id),
                config=config
            )

            active_sessions.add(session_id)

        else:

            result = graph.invoke(
                {
                    "messages": [HumanMessage(content=user_query)]
                },
                config=config
            )

        last_message = result["messages"][-1].content

        return jsonify({
            "response": last_message,
            "success": True
        })

    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500
    
##hypertension code


@app.route("/check_hypertension", methods=["POST"])
def check_hypertension():

    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    try:
        input_data = {
            "age": data.get("age"),
            "salt": data.get("salt"),
            "bp": data.get("bp"),
            "sleep_hours": data.get("sleep_hours"),
            "bmi": data.get("bmi"),
            "family_history": data.get("family_history"),
            "smoke": data.get("smoke")
        }

        result = predict_hypertension(input_data)

        query=build_query(input_data, result)
        recommendations = hypertension_recommendation_generator(query)

        return jsonify({
            "hypertension_status": str(result),
            "recommendations": recommendations,
            "success": True
        })

    except Exception as e:
        return jsonify({
            "error": str(e),
            "success": False
        }), 500

#diabetes code




@app.route("/check_diabetes", methods=["POST"])
def check_diabetes():

    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    try:
        result = predict_diabetes(data)

        query = build_query_for_diabetes(data, result)
        recommendations = diabetes_recommendation_generator(query)

        return jsonify({
            "diabetes_status": result,
            "recommendations": recommendations,
            "success": True
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "success": False
        }), 500


class _FlaskUploadFileAdapter:
    """Adapter to expose Flask upload as FastAPI UploadFile-like object."""

    def __init__(self, file_storage):
        self._file_storage = file_storage
        self.filename = file_storage.filename
        self.content_type = file_storage.content_type

    async def read(self):
        return self._file_storage.read()


@app.route("/predict", methods=["POST"])
@app.route("/scan", methods=["POST"])
def food_predict():
    print("\n[FoodLens] Incoming request")
    print(f"[FoodLens] Path: {request.path} Method: {request.method}")
    print(f"[FoodLens] Content-Type: {request.content_type}")
    print(f"[FoodLens] Content-Length: {request.content_length}")
    print(f"[FoodLens] form keys: {list(request.form.keys())}")
    print(f"[FoodLens] file keys: {list(request.files.keys())}")

    if not FOODLENS_AVAILABLE:
        print(f"[FoodLens] Module unavailable: {FOODLENS_IMPORT_ERROR}")
        return jsonify(
            {
                "success": False,
                "error": "FoodLens module failed to load",
                "details": FOODLENS_IMPORT_ERROR,
            }
        ), 500

    uploaded_file = request.files.get("file") or request.files.get("image")
    if not uploaded_file:
        print("[FoodLens] No file/image part found in multipart body.")
        return jsonify({"success": False, "error": "No file/image uploaded"}), 400

    try:
        print(
            f"[FoodLens] Received file: name={uploaded_file.filename}, "
            f"mimetype={uploaded_file.mimetype}"
        )
        adapter = _FlaskUploadFileAdapter(uploaded_file)
        result = asyncio.run(foodlens_process_image(adapter))
        print("[FoodLens] Inference completed successfully.")
        return jsonify(result)
    except Exception as e:
        print(f"[FoodLens] Inference error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/nutrition", methods=["GET"])
def food_nutrition():
    if not FOODLENS_AVAILABLE:
        return jsonify(
            {
                "success": False,
                "error": "FoodLens module failed to load",
                "details": FOODLENS_IMPORT_ERROR,
            }
        ), 500

    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"success": False, "error": "name query param is required"}), 400

    return jsonify(foodlens_get_nutrition_by_name_response(name))


@app.route("/foods", methods=["GET"])
def food_list():
    if not FOODLENS_AVAILABLE:
        return jsonify(
            {
                "success": False,
                "error": "FoodLens module failed to load",
                "details": FOODLENS_IMPORT_ERROR,
            }
        ), 500

    return jsonify(foodlens_list_food_names())










from db_con import db as firestore_db


@app.route("/diabetes_history", methods=["POST"])
def diabetes_history():
    """Fetch all diabetes assessment history for a given user."""
    data = request.get_json()
    user_id = data.get("user_id") if data else None

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        history_ref = firestore_db.collection("diabetes_results").document(user_id).collection("history")
        docs = history_ref.order_by("timestamp", direction="DESCENDING").stream()

        records = []
        for d in docs:
            record = d.to_dict()
            record["id"] = d.id
            records.append(record)

        return jsonify({
            "history": records,
            "total": len(records),
            "success": True
        })

    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


if __name__ == "__main__":
    from waitress import serve
    _log_foodlens_startup_status()
    print("Server starting on http://localhost:5000")
    serve(app, host="0.0.0.0", port=5000)

