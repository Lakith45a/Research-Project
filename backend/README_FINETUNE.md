# Llama3 Diabetes Fine-Tuning Guide

This folder contains the dataset and resources for fine-tuning a **Llama3-8B-Instruct** model to provide personalized, clinically-grounded diabetes lifestyle and dietary recommendations.

## 1. Dataset Overview

The dataset consists of **200 high-quality records** generated through a clinical RAG (Retrieval-Augmented Generation) pipeline using 20 curated doctor case studies.

- **Location:** `backend/diabetes_finetune_dataset/`
- **Files:**
  - `train.jsonl` (160 records): Used for model training.
  - `val.jsonl` (40 records): Used for validation and evaluation.
- **Format:** ChatML (System, User, Assistant messages).
- **Distribution:**
  - **Stage 3 (High Risk):** ~40%
  - **Stage 2 (Moderate Risk):** ~40%
  - **Stage 1 (Low Risk):** ~20%

### Sample Prompt Construction
Each record includes:
1. **System Prompt:** Sets the persona of a helpful health assistant.
2. **User Input:** Detailed patient health data (Age, BMI, Waist Circumference, Risk Factors) and a predicted risk stage.
3. **Assistant Response:** A multi-step recommendation including lifestyle, dietary, and preventive advice grounded in the clinical knowledge base.

## 2. Fine-Tuning Process (The "Google Colab" Way)

We use **Unsloth LoRA** for extremely efficient fine-tuning on a free-tier Google Colab T4 GPU.

1.  **Open Notebook:** Open `backend/llama3_finetune_diabetes.ipynb` in [Google Colab](https://colab.research.google.com/).
2.  **Upload Data:** Upload `train.jsonl` and `val.jsonl` to your Google Drive (`/MyDrive/diabetes_finetune/`).
3.  **Run Training:** Execute the cells in order. Total training time: ~30-45 minutes.
4.  **Export GGUF:** The notebook includes steps to export the final fine-tuned model as a `.gguf` file for local use.

## 3. Local Deployment (The "Ollama" Way)

After training in Colab, follow these steps to use your fine-tuned model locally:

1.  **Download GGUF:** Download the exported `.gguf` file from Google Drive to your `./backend` folder.
2.  **Create Modelfile:** Create a file named `Modelfile` in the same directory:
    ```dockerfile
    FROM ./unsloth.Q4_K_M.gguf
    SYSTEM "You are a helpful health assistant providing personalized lifestyle and dietary recommendations for diabetes risk management. Do not diagnose diseases or prescribe medication..."
    PARAMETER temperature 0.3
    PARAMETER stop "<|eot_id|>"
    ```
3.  **Register Model:**
    ```bash
    ollama create diabetes-advisor -f Modelfile
    ```
4.  **Update Backend:** In `backend/diabetes_recommondation.py`, update:
    ```python
    MODEL = "diabetes-advisor"
    ```

## 4. Verification

Use the `backend/test_diabetes.py` script to verify that the backend is now using your fine-tuned model and providing high-quality, personalized clinical advice.
