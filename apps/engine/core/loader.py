import pandas as pd
import numpy as np
import io

class DataLoader:
    @staticmethod
    def get_data(source: str, raw_csv_data: str = None) -> pd.DataFrame:
        
        # 1. If real CSV data is provided, parse it
        if raw_csv_data:
            try:
                # Read the CSV string into a DataFrame
                df = pd.read_csv(io.StringIO(raw_csv_data))
                
                # Standardize columns (basic cleaning)
                df.columns = [c.lower() for c in df.columns]
                
                # Ensure we have 'date' and 'revenue' columns for now
                # (In the future, we can make this dynamic)
                if 'date' not in df.columns or 'revenue' not in df.columns:
                    raise ValueError("CSV must contain 'date' and 'revenue' columns")
                
                return df
            except Exception as e:
                raise ValueError(f"Failed to parse CSV: {str(e)}")

        # 2. Fallback to Simulation
        if source == "simulate_financial_data":
            return DataLoader._generate_mock_financial_data()
        
        raise ValueError(f"Unknown data source: {source}")

    @staticmethod
    def _generate_mock_financial_data():
        dates = pd.date_range(start="2024-01-01", periods=30)
        revenue = np.random.randint(10000, 12000, size=30)
        revenue[19] = 2000 
        comments = ["Normal day" for _ in range(30)]
        comments[19] = "Crash reported by John Doe at john@company.com" 

        df = pd.DataFrame({
            "date": dates,
            "revenue": revenue,
            "notes": comments
        })
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        return df