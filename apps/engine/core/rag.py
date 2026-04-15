import os
import io
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Global initialization at startup
print("Loading Embedding Engine into RAM...")
_embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

class RAGBrain:
    _pinecone_index = None
    _embedder = None
    _groq_client = None

    @classmethod
    def initialize(cls):
        """Lazy initialization of heavy ML models and connections"""
        # Point the class attribute to the loaded global model
        if cls._embedder is None:
            print("🧠 Linking Local Embedding Model (all-MiniLM-L6-v2)...")
            cls._embedder = _embedding_model
        
        if cls._pinecone_index is None:
            pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
            cls._pinecone_index = pc.Index("insight-zero")
            
        if cls._groq_client is None:
            cls._groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    @classmethod
    def ingest_pdf(cls, pdf_bytes: bytes, filename: str):
        """Reads a PDF, chunks it, embeds it, and saves to Pinecone"""
        try:
            cls.initialize()
            print(f"📄 Processing Document: {filename}")
            
            # 1. Extract Text
            reader = PdfReader(io.BytesIO(pdf_bytes))
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:  # Ensure extracted text isn't None
                    text += extracted + "\n"
                
            if not text.strip():
                raise ValueError("No extractable text found in this PDF.")
                
            # 2. Chunk Text
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            chunks = text_splitter.split_text(text)
            
            # 3. Embed and Upsert
            vectors = []
            # Use cls._embedder (the model) to encode chunks
            embeddings = cls._embedder.encode(chunks)
            
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                # Added replace() to sanitize filenames with spaces (Pinecone requirement)
                safe_id = f"{filename}-chunk-{i}".replace(" ", "_")
                
                vectors.append({
                    "id": safe_id,
                    "values": embedding.tolist(),
                    "metadata": {"text": chunk, "source": filename}
                })
                
            # Upsert in batches of 100
            for i in range(0, len(vectors), 100):
                cls._pinecone_index.upsert(vectors=vectors[i:i+100])
                
            print(f"✅ Embedded {len(chunks)} chunks into Pinecone Database.")
            return {"status": "success", "chunks_embedded": len(chunks)}
            
        except Exception as e:
            print(f"❌ PDF Ingestion Failed: {str(e)}")
            raise e

    @classmethod
    def get_root_cause(cls, anomaly_date: str, anomaly_desc: str) -> dict:
        """Queries Pinecone for context and asks Llama-3 (Groq) for an explanation"""
        try:
            cls.initialize()
            
            # 1. Embed the search query
            query_text = f"What happened around {anomaly_date}? {anomaly_desc}"
            # Encode query using the model instance
            query_vector = cls._embedder.encode(query_text).tolist()
            
            # 2. Search Pinecone
            results = cls._pinecone_index.query(
                vector=query_vector,
                top_k=3,
                include_metadata=True
            )
            
            if not results.get('matches'):
                return {"text": f"No internal context found in uploaded documents for {anomaly_date}.", "tokens": 0}
                
            # 3. Combine retrieved context
            context = "\n---\n".join([match['metadata']['text'] for match in results['matches']])
            
            # 4. Ask Llama-3 via Groq (Prompt remains exactly as requested)
            prompt =f"""You are the Insight-Zero Autonomous Data Steward.
            A high-severity anomaly was detected in the company's financial data.
            
            [INCIDENT DETAILS]
            Date of Anomaly: {anomaly_date}
            Description: {anomaly_desc}
            
            [RETRIEVED KNOWLEDGE BASE CONTEXT]
            {context}
            
            [STRICT OPERATING PROTOCOL]
            Perform a Root Cause Analysis by following these steps exactly:
            1. TEMPORAL ISOLATION: Look at the year of the anomaly ({anomaly_date}). Scan the context for matching timeframes (e.g., "Q1 2022", "May 2022", "Three Months Ended April 30"). 
            2. DISCARD CONFLICTS: If the context discusses events from a completely different year (e.g., a server outage in 2024), you MUST completely ignore that part of the context. Do not attempt to link them.
            3. ROOT CAUSE: Using ONLY the temporally matching context, explain the business reason for the financial anomaly. Focus on business metrics (margins, inventory, freight costs).
            
            [OUTPUT FORMAT]
            Provide a clean, professional summary using Markdown bullet points. Do not mention your internal thought process. Be highly concise.
            """
            
            chat_completion = cls._groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                temperature=0.2,
            )
            
            return {
                "text": chat_completion.choices[0].message.content,
                "tokens": chat_completion.usage.total_tokens
            }
        except Exception as e:
            print(f"RAG Error: {e}")
            return {"text": "Root cause analysis temporarily unavailable.", "tokens": 0}