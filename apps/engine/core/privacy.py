from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
import pandas as pd

# Global variables to cache the models
_analyzer = None
_anonymizer = None

class DataGuard:
    @staticmethod
    def scan_and_redact(text: str) -> str:
        if not text or not isinstance(text, str):
            return text
            
        # LAZY INITIALIZATION: Only load the heavy NLP models if they haven't been loaded yet.
        global _analyzer, _anonymizer
        if _analyzer is None:
            _analyzer = AnalyzerEngine()
            _anonymizer = AnonymizerEngine()

        # Define the entities we want to redact
        entities_to_redact = ["EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "US_SSN", "PERSON"]
        
        # Scan and Anonymize
        results = _analyzer.analyze(text=text, entities=entities_to_redact, language='en')
        anonymized_text = _anonymizer.anonymize(text=text, analyzer_results=results)
        
        return anonymized_text.text

def batch_redact(series: pd.Series) -> pd.Series:
    """Apply PII redaction across a Pandas Series."""
    return series.apply(DataGuard.scan_and_redact)