# 🏥 MediSense — Full Project Architecture

> **MediSense** is an AI-powered mobile health application for proactive personal healthcare management. It combines machine learning models, LLM-based conversational agents, computer vision, and Retrieval-Augmented Generation (RAG) into a single unified system.

---

## 📁 Project Structure

```
Research-Project/
├── backend/                        # Python Flask API server
│   ├── app.py                      # Main Flask application & all API routes
│   ├── agent_graph.py              # LangGraph stress assessment agent
│   ├── diabetes.py                 # Diabetes ML prediction logic
│   ├── diabetes_recommondation.py  # RAG-based diabetes recommendations
│   ├── diabetes_model.pkl          # Trained diabetes ML model (XGBoost)
│   ├── hypertension.py             # Hypertension ML prediction logic
│   ├── hypertension_recommondation.py  # RAG-based hypertension recommendations
│   ├── RF_model_hypertension.pkl   # Trained hypertension ML model (Random Forest)
│   ├── preprocessor_hypertension.pkl   # Hypertension data preprocessor
│   ├── retrieval.py                # ChromaDB vector store retrieval
│   ├── db_con.py                   # Firebase Firestore connection
│   ├── feed.py                     # Feed utilities
│   ├── requirements.txt            # Python dependencies
│   ├── start_flask.bat             # Windows startup script
│   ├── diabetes_vector_db/         # ChromaDB vector store (diabetes KB)
│   ├── hypertension_vector_db/     # ChromaDB vector store (hypertension KB)
│   ├── knowledge-base-diabetes/    # Raw diabetes knowledge documents
│   ├── knowledge-base-hypertension/# Raw hypertension knowledge documents
│   ├── knowledge-base-stress/      # Raw stress management knowledge documents
│   ├── foodlens/                   # FoodLens computer vision module
│   │   ├── app/
│   │   │   └── services/
│   │   │       ├── inference_service.py    # YOLO image inference
│   │   │       ├── nutrition_service.py    # Nutrition lookup
│   │   │       └── model_registry.py      # YOLO model loader
│   │   ├── models/                 # YOLO model weights (best.pt, best copy.pt)
│   │   ├── ml/                     # ML training scripts
│   │   └── nutrition_database_complete.csv # 244-food nutrition database
│   └── venv/                       # Python virtual environment
│
└── frontend/
    └── app/                        # Expo React Native app (MediSense)
        ├── app/
        │   ├── _layout.js          # Root layout (Expo Router)
        │   ├── index.js            # Entry redirect
        │   ├── auth/
        │   │   ├── login.js        # Login screen
        │   │   └── register.js     # Registration screen
        │   └── main/
        │       ├── _layout.js      # Tab/stack layout
        │       ├── index.js        # Home dashboard
        │       ├── chat.js         # Stress chat AI
        │       ├── diabetes.js     # Diabetes input form
        │       ├── diabetes_quiz.js        # Diabetes quiz screen
        │       ├── diabetes_result.js      # Diabetes result display
        │       ├── diabetes_dashboard.js   # Diabetes history dashboard
        │       ├── hypertension.js         # Hypertension input form
        │       ├── hypertension_quiz.js    # Hypertension quiz screen
        │       ├── hypertension_result.js  # Hypertension result display
        │       ├── food_scan.js    # FoodLens camera scan
        │       ├── food_result.js  # Food analysis result
        │       ├── food_history.js # Meal history & nutrition trends
        │       └── health_profile.js # User health profile management
        ├── lib/
        │   ├── api.js              # Centralized API base URL config
        │   ├── foodApi.js          # FoodLens API endpoint helpers
        │   ├── firebase.js         # Firebase Auth + Firestore init
        │   ├── foodScanStore.js    # Global food scan state store
        │   └── healthLimits.js     # Health parameter threshold constants
        ├── assets/                 # Images & static assets
        ├── package.json
        └── app.json
```

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE APP (Expo Go)                       │
│                    React Native + NativeWind                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Auth     │ │ Health   │ │ Chat     │ │ FoodLens         │  │
│  │ Login/   │ │ Screening│ │ Stress   │ │ Camera + Result  │  │
│  │ Register │ │ Forms    │ │ Agent    │ │ + History        │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│       │            │            │                 │             │
│       └────────────┴────────────┴─────────────────┘            │
│                            │                                    │
│                    lib/api.js (BASE_URL)                        │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTPS (via Localtunnel)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Flask + Waitress)                    │
│                    localhost:5000  (Python)                     │
│                                                                 │
│  POST /chat              → LangGraph Stress Agent              │
│  POST /check_diabetes    → XGBoost Model + RAG Recommendations  │
│  POST /check_hypertension→ RandomForest + RAG Recommendations  │
│  POST /predict           → YOLO FoodLens Inference              │
│  GET  /nutrition         → Nutrition Database Lookup            │
│  GET  /foods             → Food List                            │
│  POST /diabetes_history  → Firestore History Fetch              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
       ┌───────────┼──────────────────┐
       ▼           ▼                  ▼
  ┌─────────┐ ┌─────────┐     ┌──────────────┐
  │ChromaDB │ │OpenAI   │     │Firebase      │
  │Vector   │ │GPT-4o   │     │Firestore     │
  │Stores   │ │mini     │     │(user data,   │
  │(RAG KB) │ │(LLM)    │     │ history)     │
  └─────────┘ └─────────┘     └──────────────┘
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Module |
|--------|----------|-------------|--------|
| `POST` | `/chat` | Stress assessment chatbot (LangGraph) | `agent_graph.py` |
| `POST` | `/check_diabetes` | Diabetes risk prediction + recommendations | `diabetes.py` + `diabetes_recommondation.py` |
| `POST` | `/check_hypertension` | Hypertension risk prediction + recommendations | `hypertension.py` + `hypertension_recommondation.py` |
| `POST` | `/predict` or `/scan` | Food image inference via YOLO | `foodlens/app/services/inference_service.py` |
| `GET` | `/nutrition?name=` | Nutrition data lookup by food name | `foodlens/app/services/nutrition_service.py` |
| `GET` | `/foods` | List all known food items | `foodlens/app/services/nutrition_service.py` |
| `POST` | `/diabetes_history` | Fetch user's diabetes assessment history | `db_con.py` + Firestore |

---

## 🧠 AI / ML Modules

### 1. Diabetes Risk Prediction
- **Model:** XGBoost (trained in `2_diabetes_risk_prediction.ipynb`)
- **Saved model:** `diabetes_model.pkl`
- **Features:** Age, Gender, Height, Weight, Waist Circumference, Diet Habits, Blood Pressure, Cholesterol, Vision Changes, BMI
- **Output:** Diabetes risk level (multi-class)
- **Recommendations:** RAG pipeline using ChromaDB (`diabetes_vector_db/`) + GPT-4o-mini
- **History:** Saved to Firestore `diabetes_results/{user_id}/history`

### 2. Hypertension Risk Prediction
- **Model:** Random Forest Classifier (trained in `hypertension_model.ipynb`)
- **Saved model:** `RF_model_hypertension.pkl` + `preprocessor_hypertension.pkl`
- **Features:** Age, Salt intake, Blood pressure history, Sleep hours, BMI, Family history, Smoking
- **Output:** Hypertension risk status (binary/categorical)
- **Recommendations:** RAG pipeline using ChromaDB (`hypertension_vector_db/`) + GPT-4o-mini

### 3. Stress Assessment Chatbot (LangGraph Agent)
- **Architecture:** LangGraph `StateGraph` with `MemorySaver` (in-memory checkpointer)
- **Agent nodes:**
  - `psychiatrist` — Conversational LLM node that asks PSS-10 stress questions naturally
  - `store_answer` — Stores user's answer for current question
  - `calculate_stress` — Calculates PSS score and maps to stress level
  - `retrieval` — Fetches relevant docs from stress knowledge base via ChromaDB
  - `recommendation` — Delivers personalized recommendations using user's hobbies from Firestore
- **Questionnaire:** 10-question Perceived Stress Scale (PSS-10)
- **Scoring:** 0–40 mapped to `No Stress`, `Low Stress`, `Moderate Stress`, `High Stress`
- **LLM:** `gpt-4o-mini` with structured output (Pydantic models)
- **Personalization:** Fetches user hobbies from Firestore to tailor recommendations

### 4. FoodLens — Food Recognition & Nutrition
- **Models:** 2× YOLO models (`best.pt` for classification, `best copy.pt` for detection)
- **Framework:** Originally FastAPI-based, now integrated into Flask via async adapter
- **Database:** 244 foods in `nutrition_database_complete.csv`
- **Fallback:** OpenAI for food validation and nutrition when DB lookup fails
- **Endpoints:** `/predict`, `/scan`, `/nutrition`, `/foods`

---

## 📱 Frontend Screens

| Screen File | Route | Description |
|-------------|-------|-------------|
| `auth/login.js` | `/auth/login` | Email/password login via Firebase Auth |
| `auth/register.js` | `/auth/register` | User registration + profile save to Firestore |
| `main/index.js` | `/main` | Home dashboard with all feature cards |
| `main/health_profile.js` | `/main/health_profile` | Save common health parameters (auto-fills forms) |
| `main/diabetes_quiz.js` | `/main/diabetes_quiz` | Intro/quiz for diabetes assessment |
| `main/diabetes.js` | `/main/diabetes` | Detailed diabetes input form |
| `main/diabetes_result.js` | `/main/diabetes_result` | Diabetes risk result + AI recommendations |
| `main/diabetes_dashboard.js` | `/main/diabetes_dashboard` | Historical diabetes risk trend charts |
| `main/hypertension_quiz.js` | `/main/hypertension_quiz` | Intro/quiz for hypertension assessment |
| `main/hypertension.js` | `/main/hypertension` | Detailed hypertension input form |
| `main/hypertension_result.js` | `/main/hypertension_result` | Hypertension result + AI recommendations |
| `main/chat.js` | `/main/chat` | Conversational stress assessment chatbot |
| `main/food_scan.js` | `/main/food_scan` | Camera-based food scanning (YOLO) |
| `main/food_result.js` | `/main/food_result` | Food recognition results + nutrition info |
| `main/food_history.js` | `/main/food_history` | Saved meal history + nutrition trends |

---

## 🔧 Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.x | Core language |
| Flask | 3.1.3 | REST API framework |
| Waitress | latest | Production WSGI server |
| Flask-CORS | latest | Cross-origin request handling |
| LangChain | 1.2.10 | LLM orchestration |
| LangGraph | 1.0.9 | Stateful agent graph |
| langchain-openai | 1.1.10 | OpenAI LLM integration |
| langchain-chroma | 1.1.0 | ChromaDB vector store |
| ChromaDB | 1.5.2 | Embedding vector database (RAG) |
| OpenAI | 2.24.0 | GPT-4o-mini LLM |
| XGBoost | 3.2.0 | Diabetes risk ML model |
| scikit-learn | 1.8.0 | Hypertension ML model (Random Forest) |
| Firebase Admin | 7.2.0 | Firestore database access |
| Ultralytics (YOLO) | latest | Food image recognition |
| FastAPI | latest | (FoodLens legacy, wrapped by Flask) |
| Pillow | latest | Image processing |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.81.5 | Mobile UI framework |
| Expo | ~54.0.7 | Development toolchain |
| Expo Router | ~6.0.23 | File-based navigation |
| NativeWind | latest | TailwindCSS for React Native |
| Firebase JS SDK | ^12.10.0 | Auth + Firestore client |
| React Native Reanimated | ~4.1.1 | Animations |
| Expo Linear Gradient | ~15.0.8 | Gradient UI elements |
| Expo Image Picker | ~17.0.11 | Camera + gallery access |
| Lucide React Native | ^0.577.0 | Icon library |
| AsyncStorage | ^2.2.0 | Local device storage |

---

## 🔐 Authentication & Database

- **Auth:** Firebase Authentication (email/password)
- **Database:** Firebase Firestore
  - `users/{uid}` — User profile (name, email, health params, hobbies)
  - `diabetes_results/{uid}/history` — Diabetes assessment history (ordered by timestamp)

---

## 🌐 Networking & Tunneling

Since the Flask backend runs locally (`localhost:5000`) and the Expo app runs on a physical phone, a tunnel is required to expose the backend to the internet.

### Current Setup (No Ngrok)
```
Phone → Expo Go (LAN mode: exp://192.168.x.x:8081)
Phone → Localtunnel URL → localhost:5000 (Flask backend)
```

### Running the Full Stack
```powershell
# Terminal 1: Backend
cd Research-Project\backend
python app.py

# Terminal 2: Localtunnel (expose backend)
npx localtunnel --port 5000
# → copies the URL it prints (e.g., https://xxx.loca.lt)

# Terminal 3: Frontend (LAN mode, no ngrok)
cd Research-Project\frontend\app
npx expo start --lan

# Update API URL whenever localtunnel restarts:
# frontend/app/lib/api.js → BASE_URL: 'https://xxx.loca.lt'
```

---

## ⚠️ Known Issues & Errors

### 1. `npx expo start --tunnel` — Ngrok Failure
**Error:**
```
CommandError: failed to start tunnel
remote gone away
Check the Ngrok status page for outages: https://status.ngrok.com/
```
**Cause:** Ngrok service outage or rate limiting on the free tier. Also seen as:
```
CommandError: TypeError: Cannot read properties of undefined (reading 'body')
```
**Fix:** Use `--lan` mode instead. Requires phone and PC on the same Wi-Fi.
```powershell
npx expo start --lan
```

---

### 2. Localtunnel "Network response was not ok"
**Error:** API calls from the mobile app return an HTML warning page from Localtunnel instead of JSON.
**Cause:** Localtunnel shows a browser reminder/warning page on first access.
**Fix:** All `fetch` calls must include the header:
```js
headers: {
  'bypass-tunnel-reminder': 'true',
  'Content-Type': 'application/json'
}
```
This is handled centrally in `lib/api.js` via a fetch wrapper.

---

### 3. `axios` / `fetch` — `localhost` Not Reachable from Phone
**Error:** API calls to `http://localhost:5000` fail silently on physical devices.
**Cause:** On a physical device, `localhost` refers to the phone itself, not the developer's PC.
**Fix:** Always use the Localtunnel public URL in `lib/api.js`:
```js
export const API_CONFIG = {
    BASE_URL: 'https://YOUR-TUNNEL-URL.loca.lt',
    ...
};
```

---

### 4. FoodLens `asyncio.run()` Conflict
**Error:** FoodLens inference (`asyncio.run(...)`) may conflict with Flask's synchronous context.
**Cause:** `foodlens/inference_service.py` uses `async def`, but Flask is synchronous. The `_FlaskUploadFileAdapter` bridges this with `asyncio.run()`.
**Note:** This works correctly with Waitress (WSGI), but may cause issues if switched to an async server.

---

### 5. Localtunnel URL Changes on Restart
**Issue:** Every time `npx localtunnel` is restarted, it issues a **new random URL**.
**Fix:** Manually update `BASE_URL` in `frontend/app/lib/api.js` and `frontend/app/lib/foodApi.js` after each restart. Consider using a `.env` file with `EXPO_PUBLIC_API_BASE_URL` for easier management:
```
# frontend/app/app/.env
EXPO_PUBLIC_API_BASE_URL=https://your-tunnel-url.loca.lt
```

---

### 6. Hypertension Model — Preprocessor Mismatch
**Potential Issue:** If input fields don't match the preprocessor's expected columns, a `ValueError` is thrown.
**Fix:** Ensure all 7 fields are always sent: `age`, `salt`, `bp`, `sleep_hours`, `bmi`, `family_history`, `smoke`.

---

### 7. Firebase Firestore History — Missing Timestamp
**Issue:** History queries ordered by `timestamp` fail if records are saved without a `timestamp` field.
**Fix:** Always include `timestamp: firestore.SERVER_TIMESTAMP` when saving results to Firestore.

---

### 8. `venv\Scripts\Activate.ps1` — PowerShell Execution Policy
**Error:**
```
.\venv\Scripts\Activate.ps1 is not recognized...
```
**Fix:** Run as Administrator and set the execution policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then activate:
```powershell
.\venv\Scripts\Activate.ps1
```

---

## 🚀 Development Startup Checklist

- [ ] `cd backend && python app.py` — Start Flask server
- [ ] `npx localtunnel --port 5000` — Expose backend
- [ ] Copy new Localtunnel URL → update `lib/api.js` `BASE_URL`
- [ ] `cd frontend/app && npx expo start --lan` — Start Expo
- [ ] Open Expo Go on phone → Scan QR code
- [ ] Phone must be on the **same Wi-Fi** as the PC

---

## 📊 Data Flow — Diabetes Assessment Example

```
User fills diabetes form (frontend)
        ↓
POST /check_diabetes
  { age, gender, height, weight, waist_circumference,
    diet_food_habits, blood_pressure, cholesterol_lipid_levels,
    vision_changes, bmi }
        ↓
diabetes.py → predict_diabetes()
  → Loads diabetes_model.pkl (XGBoost)
  → Returns risk level (e.g., "High Risk")
        ↓
build_query_for_diabetes() → constructs RAG query
        ↓
diabetes_recommondation.py → diabetes_recommendation_generator()
  → Queries diabetes_vector_db/ (ChromaDB)
  → Retrieves relevant medical docs
  → Sends to GPT-4o-mini with context
  → Returns personalized recommendations
        ↓
Response: { diabetes_status, recommendations, success }
        ↓
Result saved to Firestore: diabetes_results/{uid}/history
        ↓
Displayed on diabetes_result.js screen
```

---

*Last updated: May 2026 | Project: MediSense Research Project*
