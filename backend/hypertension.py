import pickle
import joblib
import pandas as pd
import warnings

warnings.filterwarnings("ignore")

# Load model and preprocessor
try:
    with open("RF_model_hypertension.pkl", "rb") as file:
        hypertension_model = pickle.load(file)

    preprocessor = joblib.load("preprocessor_hypertension.pkl")

except Exception as e:
    print(f"Error loading model/preprocessor: {e}")
    hypertension_model = None
    preprocessor = None


def predict_hypertension(data: dict):

    if hypertension_model is None or preprocessor is None:
        raise Exception("Model or preprocessor not loaded")


    df = pd.DataFrame([{
        "Age": data["age"],
        "Salt_Intake": data["salt"],
        "BP_History": data["bp"],
        "Sleep_Duration": data["sleep_hours"],
        "BMI": data["bmi"],
        "Family_History": data["family_history"],
        "Smoking_Status": data["smoke"]
    }])


    X = preprocessor.transform(df)


    prediction = hypertension_model.predict(X)

    return prediction[0]



# sample_input = {
#     "age": 69,
#     "salt": 8,
#     "bp": "Normal",
#     "sleep_hours": 6.4,
#     "bmi": 25.8,
#     "family_history": "Yes",
#     "smoke": "Non-Smoker"
# }

# result = predict_hypertension(sample_input)

# print("Prediction:", result)