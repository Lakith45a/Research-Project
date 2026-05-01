# Diabetes Risk Management Module

> A comprehensive intelligent module within the MediSense platform, combining Machine Learning for risk staging and a fine-tuned LLM with RAG for personalized lifestyle and prevention recommendations.

---

## 📖 Overview

The **Diabetes Risk Management** module is a core component of the MediSense health risk assessment platform. Its primary goal is to predict a user's diabetes risk stage and generate hyper-personalized lifestyle recommendations using a Retrieval-Augmented Generation (RAG) pipeline powered by Llama3.

### Key Features
- 🧬 **3-Stage Risk Classification:** Utilizes an ML model (`diabetes_model.pkl`) to categorize risk into Low (Stage 1), Moderate (Stage 2), and High (Stage 3).
- 🍎 **Dietary Assessment:** A 5-question diet quiz generating a quantifiable dietary habits score (0–10).
- 🤖 **RAG-Powered Advice:** Uses ChromaDB and Llama3 to generate personalized actionable guidance.
- 📊 **Risk Dashboard:** Tracks historical assessments with visual trend indicators and sparkline graphs.
- 🏥 **Data Continuity:** History and profile persistence via Firebase Firestore.

---

## 🏗 System Architecture

The module utilizes a distributed architecture, seamlessly integrating a React Native mobile frontend with a Python Flask backend.

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Diet Quiz      │────▶│  Biometric Form  │────▶│ API /check_diabetes │
│  (Frontend)     │     │  (Frontend)      │     │ (Backend)           │
└─────────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                            │
┌───────────────────────────────────────────────────────────▼───────────┐
│                    FLASK BACKEND PROCESSING                           │
│                                                                       │
│  1. ML Prediction (`diabetes.py`)                                     │
│     Input: Age, Gender, Height, Weight, Diet Score, BMI, etc.         │
│     Output: stage_1 | stage_2 | stage_3                               │
│                                                                       │
│  2. RAG Recommendation Engine (`diabetes_recommondation.py`)          │
│     a. Retrieve top context from ChromaDB (`diabetes_vector_db`)      │
│     b. Inject patient profile + context + stage into LLM Prompt       │
│     c. Llama3 (Ollama) generates clinical-style lifestyle advice      │
└───────────────────────────────────────────────────────────┬───────────┘
                                                            │
┌─────────────────┐     ┌──────────────────┐     ┌──────────▼───────────┐
│ Dashboard       │◀────│ Result Screen    │◀────│ Firebase Firestore   │
│ (Trend Charts)  │     │ (AI Advice)      │     │ (Assessment History) │
└─────────────────┘     └──────────────────┘     └──────────────────────┘
```

---

## ⚙️ How the Functionality Works

### 1. Data Collection (Frontend)
The user journey begins with continuous data mapping across two intuitive screens:
* **Diet Questionnaire (`diabetes_quiz.js`):** Users answer 5 questions targeting processed foods, sugar intake, and vegetable consumption. An aggregated diet score (0-10) is derived.
* **Biometric Form (`diabetes.js`):** Integrates standard metrics (Age, Height, Weight). It automatically computes the **BMI** in real-time and merges it with the diet score before requesting the backend API.

### 2. Risk Prediction (Backend)
The `/check_diabetes` endpoint parses the user request and routes it to `diabetes.py`. 
* The **scikit-learn/XGBoost** model processes 10 distinct features: `Age, Gender, Height, Weight, Waist_Circumference, Diet_Food_Habits, Blood_Pressure, Cholesterol_Lipid_Levels, Vision Changes, BMI`.
* It outputs a definitive risk label indicating early low risk to severe high risk.

### 3. Recommendation Engine (Backend)
The generated risk label triggers `diabetes_recommondation.py`:
* **Knowledge Retrieval:** Queries the local ChromaDB populated from curated medical lifestyle literature (`knowledge-base-diabetes/`).
* **LLM Synthesis:** The patient parameters and retrieved contexts are merged. Llama3 synthesizes specific, localized lifestyle interventions prioritizing diet, exercise, and stress without encroaching on explicit clinical diagnosis.

### 4. Results & Tracking (Frontend)
* **Result Display (`diabetes_result.js`):** Parses the Llama3 Markdown response alongside a color-coded staged alert badge.
* **Dashboard (`diabetes_dashboard.js`):** Aggregates historical assessments from Firestore. Compares the two most recent scans to show active trend states (Improving/Stable/Worsening).

---

## 📁 File Inventory

### Backend Components
| File | Role |
|------|------|
| `diabetes.py` | Core prediction executor loading `diabetes_model.pkl`. |
| `diabetes_recommondation.py` | RAG logic, interacting with ChromaDB matrix and Ollama LLM. |
| `rebuild_diabetes_vectordb.py`| Utility script to recreate local embeddings. |
| `knowledge-base-diabetes/` | Contains grounding truth context docs (`.md`). |
| `diabetes_model.pkl` | Pre-trained XGBoost weights (~1.3MB). |
| `generate_finetune_dataset.py`| Synthesizes profiles to finetune Llama3. |

### Frontend Components (React Native/Expo)
| File | Role |
|------|------|
| `diabetes_quiz.js` | UI rendering diet scoring parameters. |
| `diabetes.js` | Primary evaluation form sending the prediction payload. |
| `diabetes_result.js` | UI renderer for recommendations and staging alerts. |
| `diabetes_dashboard.js`| UI constructing historical graphs and trend matrices. |

---

## 🔬 Fine-Tuning The AI Pipeline

The repository integrates a complete pipeline to customize Llama3 for this exact use case:
1. `generate_finetune_dataset.py` orchestrates the creation of 200 synthetic patient records and their optimal LLM responses.
2. Training data is split intelligently across risk stages and saved into JSONL formats inside `diabetes_finetune_dataset/`.
3. The dataset is ingested by `llama3_finetune_diabetes.ipynb`, leveraging **Unsloth LoRA** for efficient fine-tuning without huge hardware overheads.
