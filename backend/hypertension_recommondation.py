from pathlib import Path
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.documents import Document

from dotenv import load_dotenv


load_dotenv(override=True)

MODEL = "gpt-4.1-nano"
DB_NAME = str(Path(__file__).parent/ "hypertension_vector_db")


embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
RETRIEVAL_K = 10

SYSTEM_PROMPT = """
You are a helpful health assistant that provides general guidance about hypertension (high blood pressure).

Your task is to give clear, practical lifestyle recommendations based on the user's health information and the provided medical context.

Guidelines:
- Use the provided context as the primary source of information.
- If the context does not contain enough information, use general medical knowledge about hypertension.
- Provide simple lifestyle suggestions such as diet, exercise, sleep, salt reduction, stress management, and healthy habits.
- simply explain how these lifestyle changes can help manage or reduce the risk of hypertension.
- Do not provide medical diagnoses or prescribe medication.
- Encourage users to consult healthcare professionals for medical decisions.
- when giving recommendations, consider the user's hypertension risk status and tailor advice accordingly.

Context:
{context}
"""
vectorstore = Chroma(persist_directory=DB_NAME, embedding_function=embeddings)
retriever = vectorstore.as_retriever()
llm = ChatOpenAI(temperature=0, model_name=MODEL)


def fetch_context(query: str) -> list[Document]:

    return retriever.invoke(query, k=RETRIEVAL_K)



def hypertension_recommendation_generator(query: str):
    docs = fetch_context(query)
    context = "\n\n".join(doc.page_content for doc in docs)
    # print(context)
    system_prompt = SYSTEM_PROMPT.format(context=context)
    messages = [SystemMessage(content=system_prompt)]
    messages.append(HumanMessage(content=query))
    response = llm.invoke(messages)
    return response.content



# def build_query(input_data: dict, hypertension_risk: str) -> str:
#     query = f"""
# A user has the following health details:
# hypertension risk status: {hypertension_risk}
# Age: {input_data['age']}
# Salt intake per day: {input_data['salt']} grams
# Blood pressure history: {input_data['bp']}
# Sleep duration: {input_data['sleep_hours']} hours
# BMI: {input_data['bmi']}
# Family history of hypertension: {input_data['family_history']}
# Smoking habit: {input_data['smoke']}

# Based on these health and lifestyle details, provide recommendations to reduce the risk of hypertension and improve overall blood pressure health.
# """
#     return query

# sample_input = {
#     "age": 69,
#     "salt": 8,
#     "bp": "Normal",
#     "sleep_hours": 6.4,
#     "bmi": 25.8,
#     "family_history": "Yes",
#     "smoke": "Non-Smoker"
# }

# query = build_query(sample_input, 'Yes')
# recommendations = hypertension_recommendation_generator(query)
# print("Recommendations:", recommendations)