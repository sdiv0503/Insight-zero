from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from core.loader import DataLoader
from core.privacy import DataGuard
from core.analyzer import StatisticalAnalyst
from core.rag import RAGBrain
from core.slide_generator import BoardroomSlide
import time
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Insight-Zero Intelligence Engine",
    description="The core machine learning and RAG API powering the Autonomous Data Steward.",
    version="1.0.0",
    contact={
        "name": "Integration Team",
        "email": "api@insight-zero.com",
    },
)

# 2. NEW CORS CONFIGURATION
# This tells Python to accept requests directly from your Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], # Trust Next.js and Node Gateway
    allow_credentials=True,
    allow_methods=["*"], # Allow POST, GET, OPTIONS, etc.
    allow_headers=["*"], # Allow all headers
)

class AnalysisRequest(BaseModel):
    data_source: str
    csv_content: Optional[str] = None
    db_connection_str: Optional[str] = None 
    db_query: Optional[str] = None          

@app.get("/")
def home():
    return {"status": "Insight-Zero Enterprise Engine Ready 🛡️"}

# --- PDF Upload Route ---
@app.post("/upload-context")
async def upload_context(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        result = RAGBrain.ingest_pdf(contents, file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
def analyze_data(request: AnalysisRequest):
    start_time = time.time() # START TIMER
    print("1. Loading Data for: {request.data_source}...")
    df = DataLoader.get_data(
            source=request.data_source, 
            csv_content=request.csv_content
        )
        
    print("2. Running Privacy Checks (Distributed)...")
    if 'notes' in df.columns:
            from core.privacy import batch_redact
            from pyspark.sql.functions import pandas_udf, col
            
            # FIX: Dynamically register the UDF here, guaranteeing Spark is ready
            redact_udf = pandas_udf(batch_redact, returnType='string')
            
            # Apply the UDF across the Spark cluster
            df = df.withColumn('safe_notes', redact_udf(col('notes')))
            
            # Count redactions in PySpark
            redacted_count = df.filter(col('notes') != col('safe_notes')).count()
            
            if redacted_count > 0:
                report_privacy_msg = f"SHIELD ACTIVE: {redacted_count} instances of sensitive PII redacted via PySpark Vectorized UDF."
            else:
                report_privacy_msg = "SHIELD ACTIVE: No PII detected."
    else:
            report_privacy_msg = "SHIELD INACTIVE: No text notes to scan."
            
    print("3. Running Statistical Analysis (PySpark Engine)...")
    report = StatisticalAnalyst.analyze_revenue(df)
    report['privacy_audit'] = report_privacy_msg

        # Trigger RAG Brain
    tokens_used = 0
    if len(report['details']) > 0:
            print("4. Querying RAG Brain for Root Cause...")
            sorted_anomalies = sorted(
                report['details'], 
                key=lambda x: (0 if x.get('severity') == 'HIGH' else 1, x.get('actual_value', float('inf')))
            )
            primary_anomaly = sorted_anomalies[0]
            
            rag_result = RAGBrain.get_root_cause(
                anomaly_date=primary_anomaly['date'], 
                anomaly_desc=primary_anomaly['description']
            )
            report['root_cause_analysis'] = rag_result['text']
            tokens_used = rag_result['tokens']

        # TELEMETRY (FINOPS)
    process_time = round(time.time() - start_time, 2)
        # Assuming GPT-4 costs ~$0.01 per 1k tokens. We show how much money we SAVED by using Llama-3 locally.
    equivalent_cost = (tokens_used / 1000) * 0.01 
        
    report['ops_metrics'] = {
            "processing_time_sec": process_time,
            "llm_tokens_used": tokens_used,
            "equivalent_openai_cost": f"${equivalent_cost:.4f}",
            "actual_cost": "$0.0000"
        }

    return report


class SlideRequest(BaseModel):
    anomaly_date: str
    revenue: str
    confidence: str
    root_cause: str

@app.post("/export-slide")
def export_slide(request: SlideRequest):
    try:
        base64_data = BoardroomSlide.generate_base64_slide(
            anomaly_date=request.anomaly_date,
            revenue=request.revenue,
            confidence=request.confidence,
            root_cause=request.root_cause
        )
        return {"filename": f"Insight-Zero_Report_{request.anomaly_date}.pptx", "data": base64_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))