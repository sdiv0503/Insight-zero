import pandas as pd
import numpy as np
import random

class DataLoader:
    """
    The Mouth.
    Responsibility: Ingest data from CSV, SQL, or generate Mock Data for testing.
    """

    @staticmethod
    def get_data(source: str) -> pd.DataFrame:
        if source == "simulate_financial_data":
            return DataLoader._generate_mock_financial_data()
        
        # Later we will add SQL logic here
        raise ValueError(f"Unknown data source: {source}")

    @staticmethod
    def _generate_mock_financial_data():
        """
        Generates a fake 30-day revenue dataset with ONE obvious anomaly.
        """
        # 1. Create 30 days of dates
        dates = pd.date_range(start="2024-01-01", periods=30)
        
        # 2. Generate normal revenue (between $10k and $12k)
        revenue = np.random.randint(10000, 12000, size=30)
        
        # 3. Inject ONE Anomaly (The "Crash") on Day 20
        # We make it $2,000 (Huge drop)
        revenue[19] = 2000 
        
        # 4. Add some PII to test the privacy engine
        comments = ["Normal day" for _ in range(30)]
        comments[19] = "Crash reported by John Doe at john@company.com" # Sensitive info!

        df = pd.DataFrame({
            "date": dates,
            "revenue": revenue,
            "notes": comments
        })
        
        # Convert dates to string for JSON compatibility
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        return df