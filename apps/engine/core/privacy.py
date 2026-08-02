import pandas as pd
import re

class DataGuard:
    @staticmethod
    def scan_and_redact(text: str) -> str:
        if not text or not isinstance(text, str):
            return text
            
        # 1. Redact Emails
        text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL]', text)
        
        # 2. Redact Phone Numbers (Basic US format)
        text = re.sub(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', '[PHONE]', text)
        
        # 3. Redact Credit Cards
        text = re.sub(r'\b(?:\d[ -]*?){13,16}\b', '[CREDIT_CARD]', text)
        
        # 4. Redact SSN
        text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', text)
        
        return text

def batch_redact(series: pd.Series) -> pd.Series:
    """Apply PII redaction across a Pandas Series using fast Regex."""
    return series.apply(DataGuard.scan_and_redact)