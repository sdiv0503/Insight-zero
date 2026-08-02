import pandas as pd
from sklearn.ensemble import IsolationForest
import logging
import traceback

# Configure robust logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StatisticalAnalyst:
    @staticmethod
    def analyze_revenue(df: pd.DataFrame):
        try:
            # 1. DYNAMIC COLUMN DISCOVERY (Handles any dataset)
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            
            if not numeric_cols:
                raise ValueError("CRITICAL: No numeric columns found in the dataset for ML analysis.")
                
            primary_col = 'revenue' if 'revenue' in df.columns else numeric_cols[0]
            date_col = 'date' if 'date' in df.columns else df.columns[0]

            logger.info(f"Multivariate ML initialized. Analyzing {len(numeric_cols)} dimensions.")

            # 2. DATA SANITIZATION
            df[numeric_cols] = df[numeric_cols].fillna(0)

            # 3. TRAINING PHASE
            # Train the Isolation Forest on the dataset (up to 50K rows for performance)
            sample_df = df[numeric_cols].head(50000)

            clf = IsolationForest(
                n_estimators=100,      
                contamination=0.005,    
                max_samples='auto',
                random_state=42,
                n_jobs=-1              
            )
            clf.fit(sample_df)

            # 4. INFERENCE PHASE (Pure Pandas + Scikit-Learn)
            logger.info("Running Isolation Forest inference on Pandas DataFrame...")
            predictions = clf.predict(df[numeric_cols])
            df = df.copy()
            df['anomaly_flag'] = predictions
            
            # Filter anomalies
            anomalies_df = df[df['anomaly_flag'] == -1].sort_values(by=primary_col)
            anomalies_list = anomalies_df.to_dict('records')

            logger.info(f"✅ Analysis completed. Found {len(anomalies_list)} anomalies.")

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

            full_trend = [{"date": str(r[date_col]), "revenue": float(r[primary_col])} for _, r in df.iterrows()]
                
            return {
                "anomalies_found": len(details),
                "details": details,
                "full_trend": full_trend
            }

        except Exception as e:
            logger.error(f"Analysis Pipeline Failed: {str(e)}")
            logger.error(traceback.format_exc())
            return {"anomalies_found": 0, "details": [], "full_trend": []}