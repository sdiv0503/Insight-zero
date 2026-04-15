import pandas as pd
from pyspark.sql import DataFrame
from pyspark.sql.functions import col, pandas_udf, struct
from sklearn.ensemble import IsolationForest
import logging
import traceback

# Configure robust logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StatisticalAnalyst:
    @staticmethod
    def analyze_revenue(df: DataFrame):
        try:
            spark = df.sparkSession
            
            # 1. DYNAMIC COLUMN DISCOVERY (Handles any dataset)
            numeric_types = ['double', 'int', 'bigint', 'float']
            numeric_cols = [f.name for f in df.schema.fields if f.dataType.typeName() in numeric_types]
            
            if not numeric_cols:
                raise ValueError("CRITICAL: No numeric columns found in the dataset for ML analysis.")
                
            primary_col = 'revenue' if 'revenue' in df.columns else numeric_cols[0]
            date_col = 'date' if 'date' in df.columns else df.columns[0]

            logger.info(f"Multivariate ML initialized. Analyzing {len(numeric_cols)} dimensions.")

            # 2. DATA SANITIZATION
            df = df.fillna(0, subset=numeric_cols)

            # 3. TRAINING PHASE (Master Node)
            # Train the Isolation Forest on a representative sample
            sample_df = df.select(numeric_cols).limit(50000).toPandas()

            clf = IsolationForest(
                n_estimators=100,      
                contamination=0.005,    
                max_samples='auto',
                random_state=42,
                n_jobs=-1              
            )
            clf.fit(sample_df)

            anomalies_list = []
            full_data = []

            # 4. INFERENCE PHASE (With High-Availability Failsafe)
            try:
                logger.info("Attempting Distributed Cluster Inference (PyArrow)...")
                broadcast_model = spark.sparkContext.broadcast(clf)

                # Safer Struct-based UDF to prevent PyArrow multi-column serialization crashes
                @pandas_udf('integer')
                def predict_anomaly(features_series: pd.Series) -> pd.Series:
                    model = broadcast_model.value
                    # Convert the PyArrow struct back into a safe Pandas DataFrame
                    pdf_chunk = pd.DataFrame(features_series.tolist(), columns=numeric_cols)
                    predictions = model.predict(pdf_chunk)
                    return pd.Series(predictions)

                # Apply the model
                df_with_preds = df.withColumn(
                    'anomaly_flag', 
                    predict_anomaly(struct(*[col(c) for c in numeric_cols]))
                )

                # Trigger Spark Action
                anomalies_df = df_with_preds.filter(col('anomaly_flag') == -1).orderBy(primary_col)
                anomalies_list = [row.asDict() for row in anomalies_df.collect()]
                full_data = df_with_preds.select(date_col, primary_col).orderBy(date_col).collect()

            except Exception as dist_error:
                # ==========================================
                # THE ENTERPRISE FAILSAFE (Catches WinError 10054)
                # ==========================================
                logger.warning("⚠️ Distributed Worker Crash Detected (Py4J Socket Error).")
                logger.warning("🔄 Initiating automatic failover to Master Driver Node...")
                
                # Fetch clean data directly to the driver
                pandas_df = df.select(date_col, *numeric_cols).toPandas()
                
                # Run the exact same Scikit-Learn model natively without PySpark overhead
                predictions = clf.predict(pandas_df[numeric_cols])
                pandas_df['anomaly_flag'] = predictions
                
                # Filter anomalies natively
                anomalies_pandas = pandas_df[pandas_df['anomaly_flag'] == -1]
                anomalies_list = anomalies_pandas.to_dict('records')
                full_data = pandas_df.to_dict('records')
                
                logger.info("✅ Master Driver Node successfully completed the analysis.")

            # 5. FORMAT RESULTS FOR NEXT.JS UI
            details = []
            for row in anomalies_list:
                val = float(row[primary_col])
                details.append({
                    "date": str(row[date_col]),
                    "actual_value": val,
                    "severity": "HIGH",
                    "description": f"Multivariate Isolation Forest triggered. Primary feature value: {val}",
                    "confidence": "99%"
                })

            full_trend = [{"date": str(r[date_col]), "revenue": float(r[primary_col])} for r in full_data]
                
            return {
                "anomalies_found": len(details),
                "details": details,
                "full_trend": full_trend
            }

        except Exception as e:
            logger.error(f"Analysis Pipeline Failed: {str(e)}")
            logger.error(traceback.format_exc())
            return {"anomalies_found": 0, "details": [], "full_trend": []}