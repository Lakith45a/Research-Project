from pathlib import Path
from langchain_openai import OpenAIEmbeddings
from langchain_ollama import ChatOllama
from langchain_chroma import Chroma
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.documents import Document

from dotenv import load_dotenv


load_dotenv(override=True)

MODEL = "llama3"
DB_NAME = str(Path(__file__).parent/ "diabetes_vector_db")


embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
RETRIEVAL_K = 10

SYSTEM_PROMPT = """
You are a helpful health assistant that provides general lifestyle guidance about diabetes.

Your task is to provide personalized lifestyle recommendations.

Guidelines:
- Use the provided context as the primary source of information.
- If the context is insufficient, rely on general knowledge about diabetes prevention and management.
- Provide practical advice such as:
  - Healthy eating habits
  - Reducing sugar intake
  - Regular exercise
  - Weight management
  - Improving sleep habits
  - Managing stress
- Explain briefly how these lifestyle changes can help control blood sugar levels and reduce diabetes risk.
- Adjust recommendations based on the user's diabetes risk level.
- Do NOT diagnose diseases or prescribe medication.
- Encourage the user to consult healthcare professionals for medical advice.

Context:
{context}
"""
vectorstore = Chroma(persist_directory=DB_NAME, embedding_function=embeddings)
retriever = vectorstore.as_retriever()
llm = ChatOllama(model=MODEL, temperature=0)  # Connects to local Ollama server (default: http://localhost:11434)


def fetch_context(query: str) -> list[Document]:

    return retriever.invoke(query, k=RETRIEVAL_K)



def diabetes_recommendation_generator(query: str):
    docs = fetch_context(query)
    context = "\n\n".join(doc.page_content for doc in docs)
    # print(context)
    system_prompt = SYSTEM_PROMPT.format(context=context)
    messages = [SystemMessage(content=system_prompt)]
    messages.append(HumanMessage(content=query))
    response = llm.invoke(messages)
    return response.content



# sample={
#   "age": 48,
#   "gender": 0,
#   "height": 194.33,
#   "weight": 93.18,
#   "waist_circumference": 35.65,
#   "diet_food_habits": 7.26,
#   "blood_pressure": 0,
#   "cholesterol_lipid_levels": 0,
#   "vision_changes": 0,
#   "bmi": 30.77
# }




# def build_query_for_diabetes(data, diabetes_level: str):

#     query = f"""
#     Patient Health Data:
#     - Age: {data['age']}
#     - Gender: {data['gender']}
#     - Height: {data['height']} cm
#     - Weight: {data['weight']} kg
#     - Waist Circumference: {data['waist_circumference']}
#     - Diet Food Habits Score: {data['diet_food_habits']}
#     - Blood Pressure Issue: {data['blood_pressure']}
#     - Cholesterol/Lipid Levels Issue: {data['cholesterol_lipid_levels']}
#     - Vision Changes: {data['vision_changes']}
#     - BMI: {data['bmi']}

#     Predicted Diabetes Level: {diabetes_level}

#     Based on this information, provide health advice, lifestyle recommendations,
#     and preventive tips for managing or reducing diabetes risk.
#     """

#     return query


# query = build_query_for_diabetes(sample, "stage_2")
# recommendations = diabetes_recommendation_generator(query)
# print("Recommendations:", recommendations)