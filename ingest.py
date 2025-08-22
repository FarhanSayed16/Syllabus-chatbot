# ingest.py
from langchain_community.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# Define the path to your data directory and the persistent database directory
DATA_PATH = "data/"
DB_PATH = "db/"

def main():
    print("Starting data ingestion process...")

    # 1. Load documents
    loader = DirectoryLoader(DATA_PATH, glob="**/*.pdf") # Use "**/*.docx" for Word documents
    documents = loader.load()
    if not documents:
        print("No documents found. Exiting.")
        return
    print(f"Loaded {len(documents)} document(s).")

    # 2. Chunk documents
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    texts = text_splitter.split_documents(documents)
    print(f"Split into {len(texts)} chunks.")

    # 3. Create embeddings
    # We will use a popular, lightweight embedding model
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 4. Store chunks in ChromaDB
    # This will create a persistent database in the 'db' folder
    vectorstore = Chroma.from_documents(documents=texts, embedding=embeddings, persist_directory=DB_PATH)
    print("Data ingestion complete. Chunks embedded and stored in ChromaDB.")

if __name__ == "__main__":
    main()