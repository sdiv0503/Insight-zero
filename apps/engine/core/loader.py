import os
import sys
from pyspark.sql import SparkSession
import io

# --- CRITICAL WINDOWS FIX ---
# Force Spark to use the Python executable from your active virtual environment
os.environ['PYSPARK_PYTHON'] = sys.executable
os.environ['PYSPARK_DRIVER_PYTHON'] = sys.executable


# Initialize Spark with Vectorized Arrow enabled and more memory allocated
spark = SparkSession.builder \
    .appName("InsightZero-Enterprise") \
    .master("local[*]") \
    .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
    .config("spark.driver.memory", "4g") \
    .getOrCreate()

class DataLoader:
    @staticmethod
    def get_data(source: str, csv_content: str = None, db_connection_str: str = None, db_query: str = None):
        if csv_content:
            # FIX: Write to a temp file on disk so Spark's highly optimized JVM can read it natively
            temp_path = "temp_ingestion_cache.csv"
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(csv_content)
            
            df = spark.read.csv(temp_path, header=True, inferSchema=True)
            return df
            
        elif db_connection_str and db_query:
            raise NotImplementedError("Spark JDBC connection not configured for this demo.")
        else:
            raise ValueError("No valid data source provided.")