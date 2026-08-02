import logging
import os

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from core.loader import DataLoader
from core.privacy import DataGuard, batch_redact
from core.analyzer import StatisticalAnalyst
from core.rag import RAGBrain
from core.slide_generator import BoardroomSlide
import time
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Insight-Zero Intelligence Engine",
    description="The core machine learning and RAG API powering the Autonomous Data Steward.",
    version="1.0.0",
    contact={
        "name": "Integration Team",
        "email": "api@insight-zero.com",
    },
)

# CORS CONFIGURATION — Allow configured origins or all in dev
allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    data_source: str
    csv_content: Optional[str] = None
    db_connection_str: Optional[str] = None 
    db_query: Optional[str] = None
    tenant_id: str = "default_tenant"

@app.get("/")
def home():
    return {"status": "Insight-Zero Enterprise Engine Ready 🛡️"}

# --- PDF Upload Route ---
@app.post("/upload-context")
async def upload_context(file: UploadFile = File(...), tenant_id: str = Form("default_tenant")):
    try:
        contents = await file.read()
        result = RAGBrain.ingest_pdf(contents, file.filename, tenant_id)
        return result
    except Exception as e:
        print(f"!!! UPLOAD CRASH: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
def analyze_data(request: AnalysisRequest):
    start_time = time.time()
    print(f"1. Loading Data for: {request.data_source}...")
    df = DataLoader.get_data(
            source=request.data_source, 
            csv_content=request.csv_content
        )
        
    print("2. Running Privacy Checks...")
    if 'notes' in df.columns:
            # Apply PII redaction directly on Pandas Series
            df['safe_notes'] = batch_redact(df['notes'])
            
            # Count redactions
            redacted_count = (df['notes'] != df['safe_notes']).sum()
            
            if redacted_count > 0:
                report_privacy_msg = f"SHIELD ACTIVE: {redacted_count} instances of sensitive PII redacted."
            else:
                report_privacy_msg = "SHIELD ACTIVE: No PII detected."
    else:
            report_privacy_msg = "SHIELD INACTIVE: No text notes to scan."
            
    print("3. Running Statistical Analysis (ML Engine)...")
    report = StatisticalAnalyst.analyze_revenue(df)
    report['privacy_audit'] = report_privacy_msg

    # Trigger RAG Brain
    tokens_used = 0
    if len(report['details']) > 0:
            print(f"4. Querying RAG Brain for Root Cause (Tenant: {request.tenant_id})...")
            sorted_anomalies = sorted(
                report['details'], 
                key=lambda x: (0 if x.get('severity') == 'HIGH' else 1, x.get('actual_value', float('inf')))
            )
            primary_anomaly = sorted_anomalies[0]
            
            rag_result = RAGBrain.get_root_cause(
                anomaly_date=primary_anomaly['date'], 
                anomaly_desc=primary_anomaly['description'],
                tenant_id=request.tenant_id
            )
            report['root_cause_analysis'] = rag_result['text']
            tokens_used = rag_result['tokens']

    # TELEMETRY (FINOPS)
    process_time = round(time.time() - start_time, 2)
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