import io
import pandas as pd


class DataLoader:
    @staticmethod
    def get_data(source: str, csv_content: str = None, db_connection_str: str = None, db_query: str = None):
        if csv_content:
            # Read CSV directly from string content using Pandas
            df = pd.read_csv(io.StringIO(csv_content))
            return df
            
        elif db_connection_str and db_query:
            raise NotImplementedError("Direct DB connection not configured for this demo.")
        else:
            raise ValueError("No valid data source provided.")