"""
generate_finetune_dataset.py
Generates a fine-tuning dataset by running 200 diverse patient profiles
through the existing RAG pipeline (ChromaDB + local Llama3 via Ollama).

Requirements:
  - Ollama must be running (ollama serve)
  - llama3 model must be pulled (ollama pull llama3)
  - Flask does NOT need to be running

Output:
  diabetes_finetune_dataset/
      train.jsonl   (~160 records, 80%)
      val.jsonl     (~40 records, 20%)
"""

import json
import random
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=True)

# Import existing RAG pipeline components directly
from diabetes_recommondation import diabetes_recommendation_generator

OUTPUT_DIR = Path(__file__).parent / "diabetes_finetune_dataset"
OUTPUT_DIR.mkdir(exist_ok=True)

SYSTEM_PROMPT = (
    "You are a helpful health assistant providing personalized lifestyle "
    "and dietary recommendations for diabetes risk management. "
    "Do not diagnose diseases or prescribe medication. "
    "Always encourage consulting healthcare professionals."
)

STAGE_LABELS = {0: "stage_1", 1: "stage_2", 2: "stage_3"}

# ---------------------------------------------------------------------------
# Patient profile generators — cover wide demographic + clinical range
# ---------------------------------------------------------------------------

def random_profile(stage: int) -> dict:
    """Generate a random patient profile biased toward a given risk stage."""
    gender = random.choice([0, 1])  # 0=Female, 1=Male

    if stage == 2:  # stage_3 — High Risk
        age = random.randint(40, 70)
        bmi = round(random.uniform(30.0, 40.0), 1)
        waist = round(random.uniform(90, 120) if gender == 1 else random.uniform(85, 115), 1)
        diet = round(random.uniform(6.5, 10.0), 2)
        bp = random.choice([0, 0, 1, 1, 1])
        chol = random.choice([0, 0, 1, 1])
        vision = random.choice([0, 0, 0, 1])

    elif stage == 1:  # stage_2 — Moderate Risk
        age = random.randint(30, 60)
        bmi = round(random.uniform(25.0, 29.9), 1)
        waist = round(random.uniform(82, 102) if gender == 1 else random.uniform(75, 88), 1)
        diet = round(random.uniform(4.0, 6.9), 2)
        bp = random.choice([0, 0, 0, 1])
        chol = random.choice([0, 0, 0, 1])
        vision = 0

    else:  # stage == 0 — stage_1 Low Risk
        age = random.randint(20, 55)
        bmi = round(random.uniform(18.5, 24.9), 1)
        waist = round(random.uniform(70, 88) if gender == 1 else random.uniform(60, 78), 1)
        diet = round(random.uniform(0.0, 3.9), 2)
        bp = 0
        chol = 0
        vision = 0

    # Derive plausible height/weight from BMI
    height = random.randint(155, 185)
    weight = round(bmi * (height / 100) ** 2, 1)

    return {
        "age": age,
        "gender": gender,
        "height": height,
        "weight": weight,
        "waist_circumference": waist,
        "diet_food_habits": diet,
        "blood_pressure": bp,
        "cholesterol_lipid_levels": chol,
        "vision_changes": vision,
        "bmi": bmi,
        "_stage": stage  # internal only — removed before RAG call
    }


def build_user_message(data: dict, stage_label: str) -> str:
    gender_str = "Male" if data["gender"] == 1 else "Female"
    bp_str = "Yes" if data["blood_pressure"] == 1 else "No"
    chol_str = "Yes" if data["cholesterol_lipid_levels"] == 1 else "No"
    vision_str = "Yes" if data["vision_changes"] == 1 else "No"

    return (
        f"Patient Health Data:\n"
        f"- Age: {data['age']}\n"
        f"- Gender: {gender_str}\n"
        f"- Height: {data['height']} cm\n"
        f"- Weight: {data['weight']} kg\n"
        f"- Waist Circumference: {data['waist_circumference']} cm\n"
        f"- Diet Food Habits Score: {data['diet_food_habits']} (0=best, 10=worst)\n"
        f"- Blood Pressure Issue: {bp_str}\n"
        f"- Cholesterol/Lipid Levels Issue: {chol_str}\n"
        f"- Vision Changes: {vision_str}\n"
        f"- BMI: {data['bmi']}\n\n"
        f"Predicted Diabetes Level: {stage_label}\n\n"
        f"Based on this information, provide health advice, lifestyle recommendations, "
        f"and preventive tips for managing or reducing diabetes risk."
    )


def build_rag_query(data: dict, stage_label: str) -> str:
    """Same format used by app.py build_query_for_diabetes()"""
    gender_str = "Male" if data["gender"] == 1 else "Female"
    return (
        f"Patient Health Data:\n"
        f"- Age: {data['age']}\n"
        f"- Gender: {gender_str}\n"
        f"- Height: {data['height']} cm\n"
        f"- Weight: {data['weight']} kg\n"
        f"- Waist Circumference: {data['waist_circumference']}\n"
        f"- Diet Food Habits Score: {data['diet_food_habits']}\n"
        f"- Blood Pressure Issue: {data['blood_pressure']}\n"
        f"- Cholesterol/Lipid Levels Issue: {data['cholesterol_lipid_levels']}\n"
        f"- Vision Changes: {data['vision_changes']}\n"
        f"- BMI: {data['bmi']}\n\n"
        f"Predicted Diabetes Level: {stage_label}\n\n"
        f"Based on this information, provide health advice, lifestyle recommendations, "
        f"and preventive tips for managing or reducing diabetes risk."
    )


# ---------------------------------------------------------------------------
# Main generation loop
# ---------------------------------------------------------------------------

def generate_dataset(target_total: int = 200):
    # distribution: 40% stage3, 40% stage2, 20% stage1
    
    # load existing records if any
    all_records = []
    train_path = OUTPUT_DIR / "train.jsonl"
    val_path = OUTPUT_DIR / "val.jsonl"
    
    if train_path.exists():
        with open(train_path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    all_records.append(json.loads(line))
                except:
                    pass
                
    if val_path.exists():
        with open(val_path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    all_records.append(json.loads(line))
                except:
                    pass
    
    current_count = len(all_records)
    print(f"Current records found (train+val): {current_count}")
    
    if current_count >= target_total:
        print(f"Target total of {target_total} already reached or exceeded.")
        return

    to_generate = target_total - current_count
    print(f"Generating {to_generate} more records to reach {target_total}...")
    
    new_records = []
    generated = 0
    failed = 0
    
    for i in range(to_generate):
        # Distribution logic for top-up
        if i < to_generate * 0.4:
            stage_idx = 2
        elif i < to_generate * 0.8:
            stage_idx = 1
        else:
            stage_idx = 0
            
        stage_label = STAGE_LABELS[stage_idx]
        profile = random_profile(stage_idx)
        rag_query = build_rag_query(profile, stage_label)
        user_msg = build_user_message(profile, stage_label)

        try:
            recommendation = diabetes_recommendation_generator(rag_query)

            record = {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                    {"role": "assistant", "content": recommendation}
                ]
            }
            new_records.append(record)
            generated += 1
            print(f"  [{generated}/{to_generate}] {stage_label} | age={profile['age']} bmi={profile['bmi']} | chars={len(recommendation)}")

        except Exception as e:
            failed += 1
            print(f"  [FAILED] record {i+1}: {e}")

        # Small pause to avoid overwhelming Ollama
        time.sleep(0.5)

    all_records.extend(new_records)
    
    # Shuffle and split 80/20
    random.shuffle(all_records)
    split = int(len(all_records) * 0.8)
    train_records = all_records[:split]
    val_records = all_records[split:]

    # Write JSONL files
    with open(train_path, "w", encoding="utf-8") as f:
        for record in train_records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    with open(val_path, "w", encoding="utf-8") as f:
        for record in val_records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"\n[SUCCESS] Dataset updated!")
    print(f"  New generated   : {generated}")
    print(f"  Failed          : {failed}")
    print(f"  Total records   : {len(all_records)}")
    print(f"  Train records   : {len(train_records)}  -> {train_path}")
    print(f"  Val records     : {len(val_records)}   -> {val_path}")


if __name__ == "__main__":
    generate_dataset(target_total=200)
