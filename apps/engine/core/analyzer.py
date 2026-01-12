import pandas as pd
import numpy as np

class StatisticalAnalyst:
    """
    The Brain (Upgraded).
    Responsibility: Run Z-Score AND IQR to find anomalies in any dataset.
    """

    @staticmethod
    def analyze_revenue(df: pd.DataFrame):
        # ... (Previous Z-Score & IQR logic remains the same) ...
        mean = df['revenue'].mean()
        std_dev = df['revenue'].std()
        df['z_score'] = (df['revenue'] - mean) / std_dev
        
        Q1 = df['revenue'].quantile(0.25)
        Q3 = df['revenue'].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - (1.5 * IQR)
        upper_bound = Q3 + (1.5 * IQR)
        
        anomalies = df[
            (df['revenue'] < lower_bound) | 
            (df['revenue'] > upper_bound) | 
            (abs(df['z_score']) > 2.5)
        ]
        
        # --- NEW: Prepare the Full Trend for the Chart ---
        # We convert the entire DataFrame to a list of dictionaries
        full_trend = df[['date', 'revenue']].to_dict(orient='records')
        
        insight_report = {
            "summary": "Analysis Complete",
            "total_rows_analyzed": len(df),
            "anomalies_found": len(anomalies),
            "statistical_profile": {
                "mean": int(mean),
                "std_dev": int(std_dev),
                "iqr_range": f"{int(lower_bound)} - {int(upper_bound)}"
            },
            # THIS IS THE NEW PART:
            "full_trend": full_trend, 
            "details": []
        }

        for index, row in anomalies.iterrows():
            severity = "HIGH"
            reasons = []
            confidence_score = 0
            
            # Check Detection Methods
            is_iqr = row['revenue'] < lower_bound or row['revenue'] > upper_bound
            is_zscore = abs(row['z_score']) > 2.5
            
            if is_iqr:
                reasons.append("Outside IQR Range")
            if is_zscore:
                reasons.append("Z-Score Spike")
            
            # Weighted Confidence Logic
            if is_iqr and is_zscore:
                confidence_score = 95 # Verified by both algorithms
            elif is_zscore:
                confidence_score = 75 # Statistical outlier
            elif is_iqr:
                confidence_score = 65 # Distribution outlier
                severity = "MEDIUM" # IQR alone is sometimes less severe

            insight_report["details"].append({
                "date": row['date'],
                "actual_value": int(row['revenue']),
                "expected_range": f"IQR: {int(lower_bound)}-{int(upper_bound)}",
                "severity": severity,
                "confidence": f"{confidence_score}%", # <--- NEW FIELD
                "detection_method": " + ".join(reasons),
                "description": f"Revenue on {row['date']} was abnormal."
            })
        return insight_report