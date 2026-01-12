import pandas as pd
import numpy as np
import io
from sqlalchemy import create_engine, text

class DataLoader:
    @staticmethod
    def get_data(source: str, csv_content: str = None, db_connection_str: str = None, db_query: str = None) -> pd.DataFrame:
        
        # 1. LIVE DATABASE MODE
        if source == "postgres_live":
            if not db_connection_str or not db_query:
                raise ValueError("Database connection string and query are required.")
            try:
                # Create a temporary engine connection
                engine = create_engine(db_connection_str)
                with engine.connect() as connection:
                    df = pd.read_sql(text(db_query), connection)
                
                # Normalize column names to lowercase
                df.columns = [c.lower() for c in df.columns]
                
                # Validation
                if 'date' not in df.columns or 'revenue' not in df.columns:
                    raise ValueError("Query result must contain 'date' and 'revenue' columns")
                
                # Ensure date is string format for JSON serialization
                if not pd.api.types.is_string_dtype(df['date']):
                    df['date'] = df['date'].astype(str)
                    
                return df
            except Exception as e:
                raise ValueError(f"Database Connection Failed: {str(e)}")

        # 2. CSV UPLOAD MODE
        if csv_content:
            try:
                df = pd.read_csv(io.StringIO(csv_content))
                df.columns = [c.lower() for c in df.columns]
                return df
            except Exception as e:
                raise ValueError(f"Failed to parse CSV: {str(e)}")

        # 3. SIMULATION MODE
        if source == "simulate_financial_data":
            return DataLoader._generate_mock_financial_data()
        
        raise ValueError(f"Unknown data source: {source}")

    @staticmethod
    def _generate_mock_financial_data():
        dates = pd.date_range(start="2024-01-01", periods=30)
        revenue = np.random.randint(10000, 12000, size=30)
        revenue[19] = 2000 
        comments = ["Normal day" for _ in range(30)]
        comments[19] = "Crash reported by John Doe" 

        df = pd.DataFrame({
            "date": dates,
            "revenue": revenue,
            "notes": comments
        })
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        return df