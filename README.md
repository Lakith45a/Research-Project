# MediSense — AI-Powered Health Risk Assessment Platform

> A mobile-first health screening application that uses machine learning models and LLM-powered recommendations to assess **Diabetes**, **Hypertension**, and **Stress** risk levels.

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Component Overview](#component-overview)
  - [Diabetes Risk Management (My Component)](#diabetes-risk-management-my-component)
  - [Hypertension Risk Management](#hypertension-risk-management)
  - [Stress Assessment Agent](#stress-assessment-agent)
- [Diabetes Risk Management — Deep Dive](#diabetes-risk-management--deep-dive)
  - [Architecture](#architecture)
  - [ML Prediction Pipeline](#ml-prediction-pipeline)
  - [RAG Recommendation Engine](#rag-recommendation-engine)
  - [Frontend User Flow](#frontend-user-flow)
  - [API Endpoints](#api-endpoints)
  - [Data Storage](#data-storage)
  - [Fine-Tuning Pipeline](#fine-tuning-pipeline)
  - [File Inventory](#file-inventory)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Project Structure](#project-structure)
- [Contributors](#contributors)

---

## Project Overview

**MediSense** is a comprehensive health risk assessment platform built as a group project. The application consists of three core health modules, each developed by a team member:

| Module | Description | Developed By |
|--------|-------------|--------------|
| **Diabetes Risk Management** | ML-based diabetes staging + LLM lifestyle recommendations | **My Component** |
| Hypertension Risk Management | Random Forest hypertension prediction + GPT-4.1-nano recommendations | Team Member |
| Stress Assessment Agent | Conversational AI stress evaluation using PSS-10 questionnaire | Team Member |

The platform uses a **React Native (Expo)** mobile frontend connected to a **Flask** backend that hosts the ML models and LLM pipelines, with **Firebase** for authentication and data persistence.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo / React Native)         │
│  ┌──────────┐  ┌───────────────┐  ┌───────────┐  ┌──────┐  │
│  │ Auth     │  │ Diabetes Quiz │  │ Hyper-    │  │ Chat │  │
│  │ Screens  │  │ + Form +      │  │ tension   │  │ (AI) │  │
│  │          │  │ Result +      │  │ Screens   │  │      │  │
│  │          │  │ Dashboard     │  │           │  │      │  │
│  └──────────┘  └───────┬───────┘  └─────┬─────┘  └──┬───┘  │
│                        │                │            │      │
│            Firebase Auth + Firestore (User Data)            │
└────────────────────────┼────────────────┼────────────┼──────┘
                         │ REST API       │            │
┌────────────────────────▼────────────────▼────────────▼──────┐
│                     FLASK BACKEND (Python)                   │
│                                                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ /check_diabetes  │  │ /check_      │  │ /chat         │  │
│  │                  │  │ hypertension │  │ (LangGraph)   │  │
│  │ diabetes.py      │  │              │  │               │  │
│  │ diabetes_        │  │ hypertension │  │ agent_graph   │  │
│  │ recommondation   │  │ .py +        │  │ .py           │  │
│  │ .py              │  │ recommond.py │  │               │  │
│  └───────┬──────────┘  └──────┬───────┘  └───────┬───────┘  │
│          │                    │                   │          │
│  ┌───────▼──────────┐  ┌─────▼────────┐  ┌──────▼───────┐  │
│  │ diabetes_model   │  │ RF_model_    │  │ GPT-4o-mini  │  │
│  │ .pkl             │  │ hypertension │  │ (OpenAI)     │  │
│  │ (Pickled ML)     │  │ .pkl         │  │              │  │
│  └──────────────────┘  └──────────────┘  └──────────────┘  │
│          │                    │                              │
│  ┌───────▼──────────┐  ┌─────▼────────┐  ┌──────────────┐  │
│  │ ChromaDB         │  │ ChromaDB     │  │ ChromaDB     │  │
│  │ diabetes_        │  │ hypertension │  │ stress_      │  │
│  │ vector_db        │  │ _vector_db   │  │ vector_db    │  │
│  └───────┬──────────┘  └──────────────┘  └──────────────┘  │
│          │                                                   │
│  ┌───────▼──────────┐                                       │
│  │ Llama3 (Ollama)  │  ◄── Local LLM for diabetes recs     │
│  └──────────────────┘                                       │
│                                                              │
│              Firebase Admin SDK (Firestore)                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3** | Backend language |
| **Flask** | REST API framework |
| **scikit-learn / XGBoost** | ML model training & prediction |
| **LangChain** | LLM orchestration & RAG pipelines |
| **ChromaDB** | Vector database for document retrieval |
| **Ollama (Llama3)** | Local LLM for diabetes recommendations |
| **OpenAI API** | Embeddings (`text-embedding-3-small`) + chat models |
| **LangGraph** | Multi-turn conversational agent (stress module) |
| **Firebase Admin** | Server-side Firestore access |
| **Waitress** | Production-ready WSGI server |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React Native 0.81** | Cross-platform mobile framework |
| **Expo SDK 54** | Development toolchain |
| **Expo Router** | File-based navigation |
| **NativeWind (TailwindCSS)** | Utility-first styling |
| **Firebase JS SDK** | Auth + Firestore client |
| **React Native Reanimated** | Animations |
| **Lucide Icons** | Icon library |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | User registration & login |
| **Cloud Firestore** | User profiles, health data, assessment history |
| **Ollama** | Local LLM server (localhost:11434) |

---

## Component Overview

### Diabetes Risk Management (My Component)

**Goal:** Predict a user's diabetes risk stage (Stage 1 / Stage 2 / Stage 3) using an ML model trained on clinical features, then generate personalized lifestyle recommendations using a RAG pipeline powered by Llama3.

**Key Features:**
- 🧬 **3-stage risk classification** via a trained ML model (`diabetes_model.pkl`)
- 🍎 **Dietary habits questionnaire** — 5-question quiz generating a diet quality score (0–10)
- 🤖 **RAG-powered recommendations** — ChromaDB retrieval + Llama3 LLM generates personalized advice
- 📊 **Risk Dashboard** — visual trend chart tracking risk over time with sparkline graphs
- 💾 **Assessment History** — all results stored in Firestore for longitudinal tracking
- 🏥 **Health Profile auto-fill** — common fields (age, gender, height, weight) pre-loaded from saved profile
- 🔬 **Fine-tuning pipeline** — tooling to generate training data and fine-tune Llama3 for domain-specific advice

### Hypertension Risk Management

- Random Forest model (`RF_model_hypertension.pkl`) with a fitted preprocessor
- Input features: age, salt intake, BP history, sleep duration, BMI, family history, smoking status
- GPT-4.1-nano (OpenAI) for personalized hypertension recommendations via RAG
- Knowledge base: `knowledge-base-hypertension/`

### Stress Assessment Agent

- Conversational AI agent built with **LangGraph** (state machine)
- Administers the PSS-10 (Perceived Stress Scale) through natural conversation
- GPT-4o-mini as the psychiatrist LLM (structured output)
- Calculates stress score and provides recommendations using user hobbies from Firestore
- Knowledge base: `knowledge-base-stress/`

---

## Diabetes Risk Management — Deep Dive

### Architecture

```
User opens app
      │
      ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Diet Quiz      │────▶│  Biometric Form  │────▶│  /check_diabetes│
│  (5 questions)  │     │  (clinical data) │     │  API call       │
│  diabetes_      │     │  diabetes.js     │     │                 │
│  quiz.js        │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                              ┌───────────▼───────────┐
                                              │    diabetes.py        │
                                              │  (ML Prediction)      │
                                              │                       │
                                              │  Input Features:      │
                                              │  Age, Gender, Height, │
                                              │  Weight, Waist, Diet, │
                                              │  BP, Cholesterol,     │
                                              │  Vision, BMI          │
                                              │                       │
                                              │  Output: stage_1 /    │
                                              │  stage_2 / stage_3    │
                                              └───────────┬───────────┘
                                                          │
                                              ┌───────────▼───────────┐
                                              │ diabetes_recommond-   │
                                              │ ation.py              │
                                              │                       │
                                              │ 1. Retrieve docs from │
                                              │    ChromaDB (k=10)    │
                                              │ 2. Build prompt with  │
                                              │    patient data +     │
                                              │    context            │
                                              │ 3. Llama3 generates   │
                                              │    recommendations    │
                                              └───────────┬───────────┘
                                                          │
                              ┌────────────────────────────▼────────────┐
                              │          Response to Frontend           │
                              │  { diabetes_status, recommendations }   │
                              └──────────┬─────────────────┬────────────┘
                                         │                 │
                              ┌──────────▼──────┐  ┌──────▼──────────┐
                              │ Result Screen   │  │ Saved to        │
                              │ diabetes_       │  │ Firestore       │
                              │ result.js       │  │ diabetes_results│
                              └────────┬────────┘  │ /{uid}/history  │
                                       │           └─────────────────┘
                              ┌────────▼────────┐
                              │ Dashboard       │
                              │ diabetes_       │
                              │ dashboard.js    │
                              │ (Trend Charts)  │
                              └─────────────────┘
```

### ML Prediction Pipeline

**File:** `backend/diabetes.py`

- **Model:** Pre-trained ML model stored as `diabetes_model.pkl` (scikit-learn/XGBoost compatible, ~1.3 MB)
- **Training notebook:** `2_diabetes_risk_prediction.ipynb`

**Input Features (10 features):**

| Feature | Type | Description |
|---------|------|-------------|
| `Age` | Numeric | Patient age |
| `Gender` | Binary | 0 = Female, 1 = Male |
| `Height` | Numeric | Height in cm |
| `Weight` | Numeric | Weight in kg |
| `Waist_Circumference` | Numeric | Waist measurement in inches |
| `Diet_Food_Habits` | Numeric (0–10) | Diet quality score from the quiz |
| `Blood_Pressure` | Binary | 0 = No issue, 1 = Diagnosed with high BP |
| `Cholesterol_Lipid_Levels` | Binary | 0 = Normal, 1 = High |
| `Vision Changes` | Binary | 0 = No, 1 = Yes |
| `BMI` | Numeric | Auto-calculated from height & weight |

**Output Labels:**

| Code | Stage | Risk Level |
|------|-------|------------|
| `0` | `stage_1` | Low Risk |
| `1` | `stage_2` | Moderate Risk |
| `2` | `stage_3` | High Risk |

### RAG Recommendation Engine

**File:** `backend/diabetes_recommondation.py`

The recommendation engine uses **Retrieval-Augmented Generation (RAG)** to generate clinically-informed lifestyle advice:

1. **Knowledge Base:** `knowledge-base-diabetes/` contains 2 markdown files:
   - `diabetes_recommondation.md` — general diabetes lifestyle guidance
   - `doctor_cases.md` — 20 curated doctor case studies

2. **Embedding & Storage:**
   - Documents are chunked (500 chars, 50 overlap) and embedded using `text-embedding-3-small` (OpenAI)
   - Stored in ChromaDB at `diabetes_vector_db/`
   - Rebuild script: `rebuild_diabetes_vectordb.py`

3. **Retrieval:** Top 10 most relevant chunks retrieved per query

4. **Generation:** Llama3 (via local Ollama server) generates personalized recommendations using:
   - System prompt defining the assistant's role and guidelines
   - Retrieved context from the knowledge base
   - Patient's health data + predicted risk stage

**System Prompt Guidelines:**
- Provide practical advice: healthy eating, reducing sugar, exercise, weight management, sleep, stress
- Adjust recommendations based on risk level
- Do NOT diagnose diseases or prescribe medication
- Encourage consulting healthcare professionals

### Frontend User Flow

The diabetes assessment follows a **2-step wizard flow** across 4 screens:

#### Screen 1: Diet Questionnaire (`diabetes_quiz.js`)
- 5 multiple-choice questions about dietary habits
- Topics: fruits/vegetables, processed food, sugary drinks, whole grains, fried foods
- Each answer scored 0–10; final score = mean of all answers
- Score passed to Step 2 as a route parameter

#### Screen 2: Biometric Data Form (`diabetes.js`)
- Numeric inputs: Age, Height (cm), Weight (kg), Waist (inches), Diet Score
- Toggle inputs: Gender (Male/Female), Blood Pressure, Cholesterol, Vision Changes
- Auto-calculated BMI displayed in real-time
- Health Profile auto-fill: loads saved age, gender, height, weight from Firestore
- Input validation with specific range checks
- On submit: sends payload to `/check_diabetes` API → saves result to Firestore → navigates to result screen

#### Screen 3: Result Display (`diabetes_result.js`)
- Shows staging analysis with color-coded risk level (Sky/Orange/Rose)
- Displays AI-generated recommendations with numbered points
- Parses bold text (`**text**`) for styled rendering
- Action buttons: View Dashboard, New Scan, Go Home

#### Screen 4: Risk Dashboard (`diabetes_dashboard.js`)
- Current risk level card with BMI, Age, and total scan count
- Trend indicator (Improving / Stable / Worsening) comparing latest 2 assessments
- Sparkline trend chart showing up to 10 assessments over time
- Full assessment history list with timestamps and risk badges

### API Endpoints

#### `POST /check_diabetes`

Predicts diabetes risk stage and generates recommendations.

**Request Body:**
```json
{
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
```

**Response:**
```json
{
  "diabetes_status": "stage_2",
  "recommendations": "Based on your health data...",
  "success": true
}
```

#### `POST /diabetes_history`

Fetches all diabetes assessment history for a user.

**Request Body:**
```json
{
  "user_id": "firebase_uid_here"
}
```

**Response:**
```json
{
  "history": [ { "diabetes_status": "stage_2", "timestamp": "...", ... } ],
  "total": 5,
  "success": true
}
```

### Data Storage

**Firestore Collection Structure:**
```
diabetes_results/
  └── {user_id}/
        └── history/        (subcollection)
              ├── {auto_id_1}
              │     ├── diabetes_status: "stage_2"
              │     ├── recommendations: "Based on..."
              │     ├── success: true
              │     ├── timestamp: "2026-04-26T..."
              │     └── input: { age, gender, height, ... }
              └── {auto_id_2}
                    └── ...
```

### Fine-Tuning Pipeline

The project includes a complete pipeline to fine-tune Llama3 for domain-specific diabetes recommendations:

| File | Purpose |
|------|---------|
| `generate_finetune_dataset.py` | Generates 200 synthetic patient profiles, runs them through the RAG pipeline to produce training data |
| `diabetes_finetune_dataset/` | Output directory containing `train.jsonl` (160 records) and `val.jsonl` (40 records) |
| `llama3_finetune_diabetes.ipynb` | Google Colab notebook for fine-tuning Llama3-8B using Unsloth LoRA |
| `README_FINETUNE.md` | Step-by-step fine-tuning and deployment guide |

**Dataset Distribution:** 40% Stage 3 (High Risk), 40% Stage 2 (Moderate), 20% Stage 1 (Low Risk)

### File Inventory

#### Backend Files (Diabetes-Specific)

| File | Lines | Purpose |
|------|-------|---------|
| `diabetes.py` | 63 | ML prediction — loads `diabetes_model.pkl`, predicts stage_1/2/3 |
| `diabetes_recommondation.py` | 108 | RAG pipeline — ChromaDB retrieval + Llama3 generation |
| `rebuild_diabetes_vectordb.py` | 72 | Rebuilds ChromaDB from knowledge base markdown files |
| `generate_finetune_dataset.py` | 244 | Generates fine-tuning dataset through the RAG pipeline |
| `test_diabetes.py` | 25 | API integration test script |
| `diabetes_model.pkl` | — | Serialized ML model (~1.3 MB) |
| `2_diabetes_risk_prediction.ipynb` | — | Model training notebook |
| `llama3_finetune_diabetes.ipynb` | — | Llama3 fine-tuning notebook |
| `knowledge-base-diabetes/` | — | 2 markdown files: recommendations + doctor cases |
| `diabetes_vector_db/` | — | ChromaDB persistent storage |
| `diabetes_finetune_dataset/` | — | Fine-tuning train/val JSONL files |

#### Frontend Files (Diabetes-Specific)

| File | Lines | Purpose |
|------|-------|---------|
| `diabetes_quiz.js` | 164 | Diet quality questionnaire (5 MCQ questions) |
| `diabetes.js` | 314 | Biometric data form with validation + API call |
| `diabetes_result.js` | 184 | Staging result display with AI recommendations |
| `diabetes_dashboard.js` | 347 | Risk dashboard with trend charts + history |

#### Shared Files Used by Diabetes Component

| File | Purpose |
|------|---------|
| `app.py` | Flask routes: `/check_diabetes`, `/diabetes_history` |
| `db_con.py` | Firebase Admin SDK initialization |
| `lib/api.js` | API base URL + endpoint constants |
| `lib/firebase.js` | Firebase client SDK initialization |
| `app/main/index.js` | Home screen with navigation to diabetes screens |

---

## Getting Started

### Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- **Ollama** installed and running (`ollama serve`)
- **Llama3** model pulled (`ollama pull llama3`)
- **Expo CLI** (`npm install -g expo-cli`)
- **Firebase project** with Firestore and Authentication enabled
- **OpenAI API key** (for embeddings)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create .env file with:
#   OPENAI_API_KEY=your_openai_api_key

# Ensure Ollama is running with Llama3
ollama serve                 # In a separate terminal
ollama pull llama3           # First time only

# (Optional) Rebuild the diabetes vector database
python rebuild_diabetes_vectordb.py

# Start the Flask server
python app.py
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
# Navigate to frontend app
cd frontend/app

# Install dependencies
npm install

# Update API base URL in lib/api.js
# Set BASE_URL to your backend address

# Start Expo development server
npx expo start

# Scan QR code with Expo Go app on your phone
```

---

## Project Structure

```
project/
├── README.md                           # This file
│
├── backend/
│   ├── app.py                          # Flask API server (all routes)
│   ├── db_con.py                       # Firebase Admin SDK connection
│   ├── .env                            # Environment variables (API keys)
│   ├── serviceAccountKey.json          # Firebase service account credentials
│   ├── requirements.txt                # Python dependencies
│   ├── start_flask.bat                 # Windows batch script to start server
│   │
│   ├── # ── DIABETES COMPONENT ───────────────────
│   ├── diabetes.py                     # ML prediction module
│   ├── diabetes_model.pkl              # Trained ML model
│   ├── diabetes_recommondation.py      # RAG recommendation engine
│   ├── diabetes_vector_db/             # ChromaDB vector store
│   ├── knowledge-base-diabetes/        # Knowledge base (2 .md files)
│   ├── rebuild_diabetes_vectordb.py    # Vector DB rebuild script
│   ├── 2_diabetes_risk_prediction.ipynb # Model training notebook
│   ├── generate_finetune_dataset.py    # Fine-tune dataset generator
│   ├── diabetes_finetune_dataset/      # train.jsonl + val.jsonl
│   ├── llama3_finetune_diabetes.ipynb  # Llama3 fine-tuning notebook
│   ├── README_FINETUNE.md             # Fine-tuning guide
│   ├── test_diabetes.py                # API test script
│   │
│   ├── # ── HYPERTENSION COMPONENT ───────────────
│   ├── hypertension.py                 # Prediction module
│   ├── RF_model_hypertension.pkl       # Random Forest model
│   ├── preprocessor_hypertension.pkl   # Data preprocessor
│   ├── hypertension_recommondation.py  # RAG recommendations (GPT-4.1-nano)
│   ├── hypertension_vector_db/         # ChromaDB vector store
│   ├── knowledge-base-hypertension/    # Knowledge base
│   ├── hypertension_model.ipynb        # Model training notebook
│   │
│   ├── # ── STRESS COMPONENT ─────────────────────
│   ├── agent_graph.py                  # LangGraph conversational agent
│   ├── retrieval.py                    # Stress knowledge retrieval
│   ├── stress_vector_db/               # ChromaDB vector store
│   ├── knowledge-base-stress/          # Knowledge base
│   ├── feed.py                         # Vector DB ingestion script
│   ├── agent_graph_builder.ipynb       # Agent development notebook
│   │
│   ├── data_set/                       # Training datasets (CSV)
│   └── venv/                           # Python virtual environment
│
└── frontend/
    └── app/
        ├── package.json                # npm dependencies (Expo SDK 54)
        ├── app.json                    # Expo configuration
        ├── lib/
        │   ├── api.js                  # API config (base URL + endpoints)
        │   └── firebase.js             # Firebase client initialization
        └── app/
            ├── _layout.js              # Root layout
            ├── index.js                # Entry point (redirect)
            ├── auth/
            │   ├── login.js            # Login screen
            │   └── register.js         # Registration screen
            └── main/
                ├── _layout.js          # Main layout with tab bar
                ├── index.js            # Home screen (MediSense dashboard)
                ├── health_profile.js   # User health profile manager
                ├── diabetes_quiz.js    # Diet questionnaire (Step 1)
                ├── diabetes.js         # Biometric form (Step 2)
                ├── diabetes_result.js  # AI staging result
                ├── diabetes_dashboard.js # Risk trend dashboard
                ├── hypertension_quiz.js # Hypertension questionnaire
                ├── hypertension.js     # Hypertension form
                ├── hypertension_result.js # Hypertension result
                └── chat.js             # Stress assessment chat
```

---

## Contributors

This project was developed as a group project with each member responsible for a specific health risk module.

| Component | Description |
|-----------|-------------|
| **Diabetes Risk Management** | ML prediction + RAG recommendations + Dashboard — **My Component** |
| Hypertension Risk Management | RF prediction + GPT recommendations |
| Stress Assessment Agent | LangGraph conversational AI |
| Shared Infrastructure | Firebase, Expo app scaffold, API framework |
