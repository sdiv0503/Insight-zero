from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional  # <--- THIS WAS MISSING
from core.loader import DataLoader
from core.privacy import DataGuard
from core.analyzer import StatisticalAnalyst

app = FastAPI()

class AnalysisRequest(BaseModel):
    data_source: str
    csv_content: Optional[str] = None 

@app.get("/")
def home():
    return {"status": "Insight-Zero Enterprise Engine Ready 🛡️"}

@app.post("/analyze")
def analyze_data(request: AnalysisRequest):
    try:
        print(f"1. Loading Data for: {request.data_source}...")
        
        # Pass the CSV content to the loader
        df = DataLoader.get_data(request.data_source, request.csv_content)
        
        print("2. Running Privacy Checks...")
        # Check if 'notes' exists before scrubbing
        if 'notes' in df.columns:
            df['safe_notes'] = df['notes'].apply(DataGuard.scan_and_redact)
        
        print("3. Running Statistical Analysis...")
        report = StatisticalAnalyst.analyze_revenue(df)
        
        # Privacy Audit Trail
        if 'safe_notes' in df.columns and len(report['details']) > 0:
             anomaly_date = report['details'][0]['date']
             # Simple lookup for the first anomaly
             row = df[df['date'] == anomaly_date]
             if not row.empty:
                safe_note = row['safe_notes'].values[0]
                report['privacy_audit'] = f"Sanitized Note: {safe_note}"

        return report

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))