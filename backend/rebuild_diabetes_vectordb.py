"""
rebuild_diabetes_vectordb.py
Run this script once after adding any new .md files to knowledge-base-diabetes/
to re-embed everything into ChromaDB.
"""

import os
import shutil
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=True)

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Paths
BASE_DIR = Path(__file__).parent
KB_DIR = BASE_DIR / "knowledge-base-diabetes"
DB_DIR = str(BASE_DIR / "diabetes_vector_db")

def rebuild():
    # 1. Load all .md files from the knowledge base directory
    md_files = list(KB_DIR.glob("*.md"))
    if not md_files:
        print("No .md files found in knowledge-base-diabetes/")
        return

    print(f"Found {len(md_files)} knowledge base file(s):")
    for f in md_files:
        print(f"   - {f.name}")

    # 2. Load documents
    all_docs = []
    for md_file in md_files:
        loader = TextLoader(str(md_file), encoding="utf-8")
        docs = loader.load()
        all_docs.extend(docs)
        print(f"   Loaded: {md_file.name} ({len(docs)} doc(s))")

    # 3. Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n## ", "\n### ", "\n---", "\n\n", "\n", " "]
    )
    chunks = splitter.split_documents(all_docs)
    print(f"\nTotal chunks created: {len(chunks)}")

    # 4. Wipe old vector DB
    if os.path.exists(DB_DIR):
        shutil.rmtree(DB_DIR)
        print(f"Cleared old vector DB at: {DB_DIR}")

    # 5. Embed and store
    print("Embedding and storing in ChromaDB (this may take 1-2 minutes)...")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=DB_DIR
    )

    print(f"\n[SUCCESS] ChromaDB rebuilt!")
    print(f"   {len(chunks)} chunks stored from {len(md_files)} files")
    print(f"   Location: {DB_DIR}")

if __name__ == "__main__":
    rebuild()
