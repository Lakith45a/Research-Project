# Stage 3: Tertiary Prevention (High Risk / Confirmed Hypertension)

## Target Audience
Users classified as Has_Hypertension = Yes OR predicted RiskLevel = High.

## Primary Goal
Achieve strict blood pressure control and prevent long-term complications such as stroke, heart disease, and kidney damage.

---

## 1. Confirmed Hypertension Status

**Feature Condition**  
IF Has_Hypertension = Yes OR BP_History = Hypertension

**Personalized Recommendation**  
Your profile indicates confirmed hypertension. It is essential to regularly monitor your blood pressure and strictly follow medical advice. Continue prescribed medication consistently and schedule routine medical check-ups to prevent serious cardiovascular complications.

**Scientific Evidence**  
WHO and AHA guidelines state that maintaining blood pressure below 130/80 mmHg significantly reduces stroke and heart disease risk.

---

## 2. High Salt Intake

**Feature Condition**  
IF Salt_Intake > 5g per day

**Personalized Recommendation**  
Your current salt intake is contributing to elevated blood pressure. Reduce daily sodium intake to less than 5 grams. Avoid processed foods and salty snacks, and prefer fresh home-cooked meals with natural herbs.

**Scientific Evidence**  
Reducing sodium intake lowers systolic blood pressure by 5–6 mmHg in hypertensive individuals.

---

## 3. Elevated BMI

**Feature Condition**  
IF BMI ≥ 23 (Asian standard)

**Personalized Recommendation**  
Your BMI indicates excess body weight, which increases pressure on your cardiovascular system. Aim for gradual weight reduction through a balanced diet and moderate exercise to improve blood pressure control.

**Scientific Evidence**  
Each kilogram of weight loss can reduce systolic blood pressure by approximately 1 mmHg.

---

## 4. High Stress Levels

**Feature Condition**  
IF Stress_Score ≥ 7

**Personalized Recommendation**  
High stress levels are increasing your blood pressure through hormonal activation. Engage in daily relaxation practices such as breathing exercises, mindfulness, or structured stress management programs.

**Scientific Evidence**  
Stress management interventions can reduce systolic blood pressure by 4–8 mmHg.

---

## 5. Smoking Risk

**Feature Condition**  
IF Smoking_Status = Smoker

**Personalized Recommendation**  
Smoking damages blood vessels and worsens hypertension. Immediate smoking cessation is strongly recommended to prevent further cardiovascular damage.

**Scientific Evidence**  
Smoking increases vascular stiffness and significantly elevates long-term cardiovascular risk.

---

# Stage 2: Secondary Prevention (Prehypertension / Moderate Risk)

## Target Audience
Users classified as BP_History = Prehypertension OR Moderate predicted risk.

## Primary Goal
Prevent progression to clinical hypertension.

---

## 1. Prehypertension Condition

**Feature Condition**  
IF BP_History = Prehypertension

**Personalized Recommendation**  
You are currently in the prehypertension stage. This condition is reversible. Increase physical activity, reduce salt intake, and monitor blood pressure regularly to prevent progression.

**Scientific Evidence**  
Lifestyle modifications can reduce systolic blood pressure by 8–14 mmHg in prehypertensive individuals.

---

## 2. Low Physical Activity

**Feature Condition**  
IF Exercise_Level = Low

**Personalized Recommendation**  
Low physical activity contributes to increased vascular resistance. Engage in at least 150 minutes of moderate aerobic activity per week, such as brisk walking or cycling.

**Scientific Evidence**  
Regular aerobic exercise reduces systolic blood pressure by 5–7 mmHg.

---

## 3. Poor Sleep Duration

**Feature Condition**  
IF Sleep_Duration < 6 hours

**Personalized Recommendation**  
Inadequate sleep increases stress hormones and blood pressure. Aim for 7–8 hours of quality sleep per night to support cardiovascular health.

**Scientific Evidence**  
Short sleep duration is associated with a significantly higher risk of developing hypertension.

---

## 4. Family History Risk

**Feature Condition**  
IF Family_History = Yes

**Personalized Recommendation**  
A family history of hypertension increases your genetic risk. Even if symptoms are absent, consistent monitoring and preventive lifestyle habits are essential.

**Scientific Evidence**  
Individuals with a positive family history have significantly higher lifetime hypertension risk.

---

# Stage 1: Primary Prevention (Low Risk / Healthy)

## Target Audience
Users classified as Has_Hypertension = No AND BP_History = Normal.

## Primary Goal
Maintain healthy blood pressure and prevent future development.

---

## 1. Healthy BMI and Lifestyle

**Feature Condition**  
IF BMI < 23 AND Salt_Intake ≤ 5g

**Personalized Recommendation**  
Your lifestyle currently supports healthy blood pressure levels. Maintain balanced nutrition, low sodium intake, and regular exercise to sustain cardiovascular health.

**Scientific Evidence**  
Maintaining optimal BMI significantly lowers lifetime hypertension risk.

---

## 2. Age-Based Screening

**Feature Condition**  
IF Age ≥ 35

**Personalized Recommendation**  
Even with low current risk, regular blood pressure screening is recommended after age 35 to detect early changes and prevent silent progression.

**Scientific Evidence**  
Routine screening improves early detection and reduces long-term cardiovascular complications.

---

## 3. Stress Prevention

**Feature Condition**  
IF Stress_Score ≤ 3

**Personalized Recommendation**  
Your stress levels are currently low. Continue maintaining healthy coping strategies to prevent long-term blood pressure elevation.

**Scientific Evidence**  
Chronic stress exposure is associated with gradual increases in resting blood pressure.