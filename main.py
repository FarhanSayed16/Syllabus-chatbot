# main.py
import json
from typing import AsyncIterable, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
from langchain_community.vectorstores import Chroma
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI()

# Allow CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Models ---
class ChatRequest(BaseModel):
    query: str
    session_id: str


# --- In-Memory Session Store for Chat Histories ---
# NOTE: In a production app, you'd replace this with a persistent store like Redis.
session_histories: Dict[str, ConversationBufferMemory] = {}


# --- Load Foundational Components ---
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory="db/", embedding_function=embeddings)
llm = Ollama(model="llama3")

prompt_template = """
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Provide a detailed and helpful answer based ONLY on the context provided.

Context: {context}

Question: {question}
Answer:
"""
PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])


# --- Main Chat Logic (Using modern .astream() method) ---
async def chat_stream_generator(request: ChatRequest) -> AsyncIterable[str]:
    """
    This function uses the modern .astream() method to stream the response.
    It yields answer tokens as they are generated and then the source documents at the end.
    """
    # Get or create chat history for the session
    if request.session_id not in session_histories:
        session_histories[request.session_id] = ConversationBufferMemory(
            memory_key="chat_history", return_messages=True, output_key="answer"
        )
    memory = session_histories[request.session_id]

    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vectorstore.as_retriever(),
        memory=memory,
        combine_docs_chain_kwargs={"prompt": PROMPT},
        return_source_documents=True,
    )

    source_documents = []
    # Use the .astream() method for streaming, which is the modern approach
    async for chunk in qa_chain.astream({"question": request.query}):
        # Yield answer tokens as they come in from the stream
        if "answer" in chunk:
            yield chunk["answer"]

        # Collect source documents as they are processed
        if "source_documents" in chunk:
            source_documents.extend(chunk["source_documents"])

    # After the answer stream is complete, format and yield the unique sources
    if source_documents:
        unique_sources = list(
            set([doc.metadata.get("source", "Unknown") for doc in source_documents])
        )
        # Use a special prefix to distinguish sources from answer tokens
        yield "SOURCES::" + json.dumps(unique_sources)


# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Syllabus Chatbot is running!"}


@app.post("/api/ask", response_class=StreamingResponse)
async def ask_question_stream(request: ChatRequest):
    return StreamingResponse(
        chat_stream_generator(request), media_type="text/event-stream"
    )