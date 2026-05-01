import requests, json

payload = {
    "age": 48,
    "gender": 0,
    "height": 194.33,
    "weight": 93.18,
    "waist_circumference": 35.65,
    "diet_food_habits": 7.26,
    "blood_pressure": 0,
    "cholesterol_lipid_levels": 0,
    "vision_changes": 0,
    "bmi": 30.77
}

print("Sending request to /check_diabetes ...")
resp = requests.post("http://127.0.0.1:5000/check_diabetes", json=payload, timeout=120)
data = resp.json()

print("\n=== RESULT ===")
print("Status  :", data.get("diabetes_status"))
print("Success :", data.get("success"))
print("\nRecommendations:\n")
print(data.get("recommendations"))
