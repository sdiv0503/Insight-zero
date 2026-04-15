from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from pyspark.sql.functions import udf
from pyspark.sql.types import StringType
from pyspark.sql.functions import pandas_udf
import pandas as pd

# Global variables to cache the models on the worker nodes
_analyzer = None
_anonymizer = None

class DataGuard:
    @staticmethod
    def scan_and_redact(text: str) -> str:
        if not text:
            return text
            
        # LAZY INITIALIZATION: Only load the heavy NLP models if they haven't been loaded yet.
        # This prevents the massive OOM spike when Spark starts up.
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

def batch_redact(s: pd.Series) -> pd.Series:
    return s.apply(DataGuard.scan_and_redact)