import pickle
import pandas as pd
import warnings

warnings.filterwarnings("ignore")

# Load model
try:
    with open("diabetes_model.pkl", "rb") as file:
        diabetes_model = pickle.load(file)
except Exception as e:
    print(f"Error loading model: {e}")
    diabetes_model = None


def predict_diabetes(data: dict):

    if diabetes_model is None:
        raise Exception("Model not loaded")

    # Create dataframe with correct column names
    df = pd.DataFrame([{
        "Age": data["age"],
        "Gender": data["gender"],
        "Height": data["height"],
        "Weight": data["weight"],
        "Waist_Circumference": data["waist_circumference"],
        "Diet_Food_Habits": data["diet_food_habits"],
        "Blood_Pressure": data["blood_pressure"],
        "Cholesterol_Lipid_Levels": data["cholesterol_lipid_levels"],
        "Vision Changes": data["vision_changes"],
        "BMI": data["bmi"]
    }])

    prediction = diabetes_model.predict(df)

    labels = {
        0: "stage_1",
        1: "stage_2",
        2: "stage_3"
    }

    return labels.get(prediction[0])
    

# # Test file directly
# if __name__ == "__main__":

#     sample_input = {
#         "age": 48,
#         "gender": 0,
#         "height": 194.33,
#         "weight": 93.18,
#         "waist_circumference": 35.65,
#         "diet_food_habits": 7.26,
#         "blood_pressure": 0,
#         "cholesterol_lipid_levels": 0,
#         "vision_changes": 0,
#         "bmi": 30.77
#     }

#     result = predict_diabetes(sample_input)
#     print("Prediction:", result)