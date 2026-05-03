import firebase_admin
from firebase_admin import credentials, firestore


if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()


def get_user_hobbies(user_id: str):

    try:
        doc_ref = db.collection("users").document(user_id)
        doc = doc_ref.get()

        if doc.exists:
            user_data = doc.to_dict()
            return user_data.get("hobbies", [])

        return {"error": "User not found"}

    except Exception as e:
        return {"error": str(e)}
    
def get_user_location(user_id: str):

    try:
        doc_ref = db.collection("users").document(user_id)
        doc = doc_ref.get()

        if doc.exists:
            user_data = doc.to_dict()
            return user_data.get("location")

        return {"error": "User not found"}

    except Exception as e:
        return {"error": str(e)}
    

# hobbies= get_user_hobbies("6RuThcCebLMWBdAUxSrhKZLEHei2")
# print("User Hobbies:", hobbies)

# location= get_user_location("6RuThcCebLMWBdAUxSrhKZLEHei2")
# print("User Hobbies:", location)