# Use a slim Debian-based Python image
FROM python:3.11-slim-bullseye

# Set the working directory inside the container
WORKDIR /app

# Install build essentials for native Python packages (no Java needed anymore)
RUN apt-get update && \
    apt-get install -y build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Copy the minimal requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -m nltk.downloader punkt_tab stopwords

# 3. Download the heavy NLP model locally so it caches into the Docker layer
RUN PIP_DEFAULT_TIMEOUT=1000 python -m spacy download en_core_web_sm

# Copy the rest of the application
COPY . .

# Expose the FastAPI port
EXPOSE 8000

# Run the server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]