import pandas as pd
import numpy as np

class StatisticalAnalyst:
    """
    The Brain (Upgraded).
    Responsibility: Run Z-Score AND IQR to find anomalies in any dataset.
    """

    @staticmethod
    def analyze_revenue(df: pd.DataFrame):
        # --- METHOD 1: Z-SCORE (Standard Deviation) ---
        mean = df['revenue'].mean()
        std_dev = df['revenue'].std()
        df['z_score'] = (df['revenue'] - mean) / std_dev
        
        # --- METHOD 2: IQR (Interquartile Range) ---
        # Robust method for skewed data
        Q1 = df['revenue'].quantile(0.25)
        Q3 = df['revenue'].quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - (1.5 * IQR)
        upper_bound = Q3 + (1.5 * IQR)
        
        # Determine anomalies: simpler to flag if it fails BOTH checks or just one
        # Here we flag if it fails EITHER (Conservative approach)
        anomalies = df[
            (df['revenue'] < lower_bound) | 
            (df['revenue'] > upper_bound) | 
            (abs(df['z_score']) > 2.5)
        ]
        
        insight_report = {
            "summary": "Analysis Complete (Multi-Method)",
            "total_rows_analyzed": len(df),
            "anomalies_found": len(anomalies),
            "statistical_profile": {
                "mean": int(mean),
                "std_dev": int(std_dev),
                "iqr_range": f"{int(lower_bound)} - {int(upper_bound)}"
            },
            "details": []
        }

        for index, row in anomalies.iterrows():
            # Determine severity
            severity = "HIGH"
            reason = []
            
            if row['revenue'] < lower_bound or row['revenue'] > upper_bound:
                reason.append("Outside IQR Range")
            if abs(row['z_score']) > 3:
                reason.append("3x Std Dev (Z-Score)")
            
            insight_report["details"].append({
                "date": row['date'],
                "actual_value": int(row['revenue']),
                "expected_range": f"IQR: {int(lower_bound)}-{int(upper_bound)}",
                "severity": severity,
                "detection_method": " + ".join(reason),
                "description": f"Revenue on {row['date']} was abnormal."
            })

        return insight_report