import os
from pathlib import Path
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv


load_dotenv()

DB_NAME = str(Path(__file__).parent / "stress_vector_db")

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

RETRIEVAL_K = 5

vectorstore = Chroma(
    persist_directory=DB_NAME,
    embedding_function=embeddings
)

retriever = vectorstore.as_retriever(search_kwargs={"k": RETRIEVAL_K})


def fetch_context(query: str):
    docs = retriever.invoke(query)
    return docs


# docs = fetch_context("give recommendation for low stress")

# context = "\n\n".join(doc.page_content for doc in docs)

# print(context)