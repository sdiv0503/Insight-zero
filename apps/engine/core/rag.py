import os
import io
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class RAGBrain:
    _pinecone_index = None
    _embedder = None
    _groq_client = None

    @classmethod
    def initialize(cls):
        """Lazy initialization of heavy ML models and connections"""
        if cls._embedder is None:
            print("🧠 Loading Local Embedding Model (all-MiniLM-L6-v2)...")
            cls._embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
        if cls._pinecone_index is None:
            pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
            cls._pinecone_index = pc.Index("insight-zero")
            
        if cls._groq_client is None:
            cls._groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    @classmethod
    def ingest_pdf(cls, pdf_bytes: bytes, filename: str):
        """Reads a PDF, chunks it, embeds it, and saves to Pinecone"""
        cls.initialize()
        print(f"📄 Processing Document: {filename}")
        
        # 1. Extract Text
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        # 2. Chunk Text (So we don't overwhelm the LLM)
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = text_splitter.split_text(text)
        
        # 3. Embed and Upsert
        vectors = []
        for i, chunk in enumerate(chunks):
            embedding = cls._embedder.encode(chunk).tolist()
            vectors.append({
                "id": f"{filename}-chunk-{i}",
                "values": embedding,
                "metadata": {"text": chunk, "source": filename}
            })
            
        # Upsert in batches of 100
        for i in range(0, len(vectors), 100):
            cls._pinecone_index.upsert(vectors=vectors[i:i+100])
            
        return {"status": "success", "chunks_embedded": len(chunks)}

    @classmethod
    def get_root_cause(cls, anomaly_date: str, anomaly_desc: str) -> str:
        """Queries Pinecone for context and asks Llama-3 (Groq) for an explanation"""
        try:
            cls.initialize()
            
            # 1. Embed the search query
            query_text = f"What happened around {anomaly_date}? {anomaly_desc}"
            query_vector = cls._embedder.encode(query_text).tolist()
            
            # 2. Search Pinecone for top 3 most relevant PDF chunks
            results = cls._pinecone_index.query(
                vector=query_vector,
                top_k=3,
                include_metadata=True
            )
            
            if not results['matches']:
                return "No internal context found in uploaded documents."
                
            # 3. Combine retrieved context
            context = "\n---\n".join([match['metadata']['text'] for match in results['matches']])
            
            # 4. Ask Llama-3 via Groq
            prompt = f"""You are the Insight-Zero Autonomous Data Steward.
            An anomaly was detected in the company's data:
            Date: {anomaly_date}
            Issue: {anomaly_desc}
            
            Here is the internal documentation retrieved from the company knowledge base:
            {context}
            
            Analyze the context and explain the likely root cause of this anomaly. 
            
            CRITICAL INSTRUCTIONS:
            1. Look at the date of the anomaly ({anomaly_date}) and compare it to the dates mentioned in the context.
            2. If the context refers to events in a completely different month or is clearly unrelated to this specific date, DO NOT invent a connection.
            3. If the context does not match, simply reply exactly with: "The internal knowledge base does not contain relevant documents for the anomaly on {anomaly_date}."
            4. If the context DOES match, explain the root cause concisely in 2-3 sentences.
            """
            
            chat_completion = cls._groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant", # <--- NEW ACTIVE MODEL
                temperature=0.2,
            )
            
            return {
                "text": chat_completion.choices[0].message.content,
                "tokens": chat_completion.usage.total_tokens
            }
        except Exception as e:
            print(f"RAG Error: {e}")
            return {"text": "Root cause analysis temporarily unavailable.", "tokens": 0}