import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

# 1. Connect to your Local Docker DB
# (Using the same credentials as your API)
db_url = "postgresql://postgres:postgre@localhost:5432/insight_zero"
engine = create_engine(db_url)

print("🔌 Connecting to Docker Database...")

# 2. Generate Fake Data (Simulating a Client's Database)
dates = pd.date_range(start="2024-05-01", periods=30)
revenue = np.random.randint(50000, 60000, size=30) # Higher revenue for this test
revenue[15] = 10000 # The Anomaly (Crash)

df = pd.DataFrame({
    "date": dates,
    "revenue": revenue,
    "region": "North America",
    "status": "Active"
})

# 3. Upload to Postgres
print("💾 Creating 'sales_data' table...")
df.to_sql('sales_data', engine, if_exists='replace', index=False)

print("✅ Success! 'sales_data' table created with 30 rows.")
print("   Anomaly injected on:", df.iloc[15]['date'])