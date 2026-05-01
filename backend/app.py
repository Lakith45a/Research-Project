
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_core.messages import HumanMessage
from agent_graph import build_graph
from langchain_core.messages import AIMessage, HumanMessage

from hypertension import predict_hypertension
from hypertension_recommondation import hypertension_recommendation_generator
from diabetes import predict_diabetes
from diabetes_recommondation import diabetes_recommendation_generator


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
    from waitress import serve; print("Server starting on http://localhost:5000"); serve(app, host="0.0.0.0", port=5000)

