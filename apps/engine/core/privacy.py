from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

# Initialize engines only once (Heavy operation)
analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

class DataGuard:
    """
    The Security Guard. 
    Responsibility: Check data for PII (Personally Identifiable Information) 
    and redact it before the Analyst sees it.
    """
    
    @staticmethod
    def scan_and_redact(text_data: str):
        try:
            # 1. Analyze: Find the sensitive info
            results = analyzer.analyze(text=text_data, entities=["PHONE_NUMBER", "EMAIL_ADDRESS", "PERSON"], language='en')
            
            # 2. Anonymize: Replace it with <REDACTED>
            anonymized_result = anonymizer.anonymize(
                text=text_data,
                analyzer_results=results
            )
            
            return anonymized_result.text
        except Exception as e:
            print(f"Privacy Error: {e}")
            return text_data # Fail safe: return original if scrubber fails