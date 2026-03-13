from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from core.loader import DataLoader
from core.privacy import DataGuard
from core.analyzer import StatisticalAnalyst
from core.rag import RAGBrain
from core.slide_generator import BoardroomSlide
import time

app = FastAPI(
    title="Insight-Zero Intelligence Engine",
    description="The core machine learning and RAG API powering the Autonomous Data Steward.",
    version="1.0.0",
    contact={
        "name": "Integration Team",
        "email": "api@insight-zero.com",
    },
)

class AnalysisRequest(BaseModel):
    data_source: str
    csv_content: Optional[str] = None
    db_connection_str: Optional[str] = None 
    db_query: Optional[str] = None          

@app.get("/")
def home():
    return {"status": "Insight-Zero Enterprise Engine Ready 🛡️"}

# --- NEW: PDF Upload Route ---
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
    try:
        print(f"1. Loading Data for: {request.data_source}...")
        df = DataLoader.get_data(
            source=request.data_source, 
            csv_content=request.csv_content,
            db_connection_str=request.db_connection_str,
            db_query=request.db_query
        )
        
        print("2. Running Privacy Checks...")
        if 'notes' in df.columns:
            df['safe_notes'] = df['notes'].apply(DataGuard.scan_and_redact)
            
        print("3. Running Statistical Analysis...")
        report = StatisticalAnalyst.analyze_revenue(df)
        
        if 'safe_notes' in df.columns and len(report['details']) > 0:
             anomaly_date = report['details'][0]['date']
             row = df[df['date'] == anomaly_date]
             if not row.empty:
                report['privacy_audit'] = f"Sanitized Note: {row['safe_notes'].values[0]}"

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

        # NEW: TELEMETRY (FINOPS)
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

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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