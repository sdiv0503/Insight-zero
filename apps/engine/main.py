from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from core.loader import DataLoader
from core.privacy import DataGuard
from core.analyzer import StatisticalAnalyst

app = FastAPI()

class AnalysisRequest(BaseModel):
    data_source: str

@app.get("/")
def home():
    return {"status": "Insight-Zero Enterprise Engine Ready 🛡️"}

@app.post("/analyze")
def analyze_data(request: AnalysisRequest):
    try:
        print(f"1. Loading Data for: {request.data_source}...")
        
        # 1. Load Data
        # If the user asks for 'Sales_DB', we force simulation for now
        source = "simulate_financial_data" if "Sales" in request.data_source else request.data_source
        df = DataLoader.get_data(source)
        
        print("2. Running Privacy Checks...")
        # 2. Privacy Scan (Check the 'notes' column for PII)
        # We apply the redactor to the 'notes' column
        df['safe_notes'] = df['notes'].apply(DataGuard.scan_and_redact)
        
        print("3. Running Statistical Analysis...")
        # 3. Analyze
        report = StatisticalAnalyst.analyze_revenue(df)
        
        # Add the sanitized sample data to the report so we can see the redaction working
        # (We only send back the specific anomaly row's notes)
        if len(report['details']) > 0:
            anomaly_date = report['details'][0]['date']
            # Find the note for that date
            safe_note = df[df['date'] == anomaly_date]['safe_notes'].values[0]
            report['privacy_audit'] = f"Sanitized Note: {safe_note}"

        return report

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))