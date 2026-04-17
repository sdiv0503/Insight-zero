import os
import io
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from pinecone_text.sparse import BM25Encoder
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Global initialization at startup
print("Loading Dense Embedding Engine (all-MiniLM)...")
_dense_model = SentenceTransformer('all-MiniLM-L6-v2')

print("Loading Sparse Embedding Engine (BM25)...")
# Initialize default BM25 encoder for exact keyword matching
_bm25_encoder = BM25Encoder().default()

class RAGBrain:
    _pinecone_index = None
    _dense_embedder = None
    _sparse_embedder = None
    _groq_client = None

    @classmethod
    def initialize(cls):
        """Lazy initialization of heavy ML models and connections"""
        if cls._dense_embedder is None:
            cls._dense_embedder = _dense_model
            
        if cls._sparse_embedder is None:
            cls._sparse_embedder = _bm25_encoder
        
        if cls._pinecone_index is None:
            pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
            cls._pinecone_index = pc.Index("insight-zero")
            
        if cls._groq_client is None:
            cls._groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    @classmethod
    def ingest_pdf(cls, pdf_bytes: bytes, filename: str, tenant_id: str):
        """Chunks PDF, creates Hybrid Vectors (Sparse+Dense), and saves to a secure Namespace"""
        try:
            cls.initialize()
            print(f"📄 Processing Document for Tenant [{tenant_id}]: {filename}")
            
            # 1. Extract Text
            reader = PdfReader(io.BytesIO(pdf_bytes))
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:  
                    text += extracted + "\n"
                
            if not text.strip():
                raise ValueError("No extractable text found in this PDF.")
                
            # 2. Chunk Text
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            chunks = text_splitter.split_text(text)
            
            # 3. Generate HYBRID Embeddings
            vectors = []
            dense_embeddings = cls._dense_embedder.encode(chunks)
            sparse_embeddings = cls._sparse_embedder.encode_documents(chunks)
            
            for i, (chunk, dense, sparse) in enumerate(zip(chunks, dense_embeddings, sparse_embeddings)):
                safe_id = f"{filename}-chunk-{i}".replace(" ", "_")
                
                vectors.append({
                    "id": safe_id,
                    "values": dense.tolist(),
                    "sparse_values": sparse, # The BM25 Exact Match Data
                    "metadata": {"text": chunk, "source": filename}
                })
                
            # 4. Upsert securely to the Tenant's Namespace
            for i in range(0, len(vectors), 100):
                cls._pinecone_index.upsert(
                    vectors=vectors[i:i+100], 
                    namespace=tenant_id # Strict Multi-Tenancy Data Isolation
                )
                
            print(f"✅ Embedded {len(chunks)} chunks securely into Namespace: {tenant_id}.")
            return {"status": "success", "chunks_embedded": len(chunks)}
            
        except Exception as e:
            print(f"❌ PDF Ingestion Failed: {str(e)}")
            raise e

    @classmethod
    def get_root_cause(cls, anomaly_date: str, anomaly_desc: str, tenant_id: str) -> dict:
        """Queries Pinecone using Hybrid Search within the strict Tenant Namespace"""
        try:
            cls.initialize()
            
            query_text = f"What happened around {anomaly_date}? {anomaly_desc}"
            
            # 1. Embed Hybrid Query
            dense_query = cls._dense_embedder.encode(query_text).tolist()
            sparse_query = cls._sparse_embedder.encode_queries(query_text)
            
            # 2. Hybrid Search in specific Namespace
            results = cls._pinecone_index.query(
                vector=dense_query,
                sparse_vector=sparse_query, # Exact keyword search active
                top_k=3,
                include_metadata=True,
                namespace=tenant_id         # Only search this tenant's files
            )
            
            if not results.get('matches'):
                return {"text": f"No internal context found in uploaded documents for {anomaly_date}.", "tokens": 0}
                
            context = "\n---\n".join([match['metadata']['text'] for match in results['matches']])
            
            prompt =f"""You are the Insight-Zero Autonomous Data Steward.
            A high-severity anomaly was detected in the company's financial data.
            
            [INCIDENT DETAILS]
            Date of Anomaly: {anomaly_date}
            Description: {anomaly_desc}
            
            [RETRIEVED KNOWLEDGE BASE CONTEXT]
            {context}
            
            [STRICT OPERATING PROTOCOL]
            Perform a Root Cause Analysis by following these steps exactly:
            1. TEMPORAL ISOLATION: Look at the year of the anomaly ({anomaly_date}). Scan the context for matching timeframes (e.g., "Q1 2022", "May 2022", "Three Months Ended April 30"). Only consider context that explicitly matches the anomaly's timeframe.

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