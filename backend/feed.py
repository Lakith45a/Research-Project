import os
from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

from dotenv import load_dotenv

load_dotenv(override=True)


BASE_DIR = Path(__file__).parent
DB_NAME = str(BASE_DIR / "stress_vector_db")
KNOWLEDGE_BASE = str(BASE_DIR / "knowledge-base-stress")

# DB_NAME = str(BASE_DIR / "hypertension_vector_db")
# KNOWLEDGE_BASE = str(BASE_DIR / "knowledge-base-hypertension")

#DB_NAME = str(BASE_DIR / "diabetes_vector_db")
#KNOWLEDGE_BASE = str(BASE_DIR / "knowledge-base-diabetes")




embeddings = OpenAIEmbeddings(model="text-embedding-3-small")



def fetch_documents():

    loader = DirectoryLoader(
        KNOWLEDGE_BASE,
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
    )

    documents = loader.load()


    for doc in documents:
        doc.metadata["source"] = "stress_recommendations"

    return documents


def create_chunks(documents):

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
    )

    chunks = text_splitter.split_documents(documents)

    print(f"Created {len(chunks)} chunks")

    return chunks



def create_embeddings(chunks):

    if os.path.exists(DB_NAME):
        Chroma(persist_directory=DB_NAME, embedding_function=embeddings).delete_collection()

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=DB_NAME,
    )

    collection = vectorstore._collection
    count = collection.count()

    sample_embedding = collection.get(limit=1, include=["embeddings"])["embeddings"][0]
    dimensions = len(sample_embedding)

    print(f"Vector DB created")
    print(f"Vectors: {count}")
    print(f"Embedding dimensions: {dimensions}")

    return vectorstore


if __name__ == "__main__":

    documents = fetch_documents()

    chunks = create_chunks(documents)

    create_embeddings(chunks)

    print("Ingestion complete")