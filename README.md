# 🛡️ Insight-Zero
**The Autonomous Data Steward for Enterprise.**

Insight-Zero is an autonomous, microservice-based data intelligence platform designed to replace the manual data extraction and anomaly detection loop. It features unsupervised statistical learning, PII sanitization, and a Context-Aware RAG (Retrieval-Augmented Generation) brain to not just detect anomalies, but explain *why* they happened.

---

## 🚀 Key Features

* **Privacy-First Ingestion:** Utilizes a custom NLP pipeline (Microsoft Presidio) to detect and redact Personally Identifiable Information (PII) before it ever reaches the AI analysis layer.
* **Ensemble Statistical Engine:** Combines parametric (Z-Score) and non-parametric (IQR) modeling to generate high-confidence anomaly scores without requiring massive labeled training datasets.
* **Context-Aware RAG Brain:** Integrates Pinecone Vector DB with Meta's Llama-3.1. Users can upload internal corporate PDFs, allowing the AI to diagnose root causes based on proprietary company context.
* **Asynchronous Enterprise Ops:** Powered by BullMQ and Redis, ensuring the platform scales to process massive datasets in the background without blocking the UI.
* **Multi-Modal Reporting:** Autonomously generates and exports boardroom-ready `.pptx` slides and high-resolution PDF incident reports.
* **FinOps Telemetry:** Built-in cost monitoring dashboard tracking processing latency and LLM token usage to prove operational ROI.

---

## 🏗️ System Architecture

This project is structured as a Monorepo utilizing a 3-Tier Microservice architecture:

1. **Frontend (`apps/web`):** Next.js 14, Tailwind CSS, Shadcn UI, Clerk Auth.
2. **Orchestration Gateway (`apps/api`):** Node.js, Express, BullMQ, Redis. (Handles secure routing, queuing, and background job polling).
3. **Intelligence Engine (`apps/engine`):** Python, FastAPI, Pandas, Presidio, Pinecone, Groq (Llama-3.1), Sentence-Transformers.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
* Node.js (v18+)
* Python (3.11+)
* Redis (Local or Upstash Cloud)
* API Keys: Clerk, Pinecone, Groq

### 2. Installation
Clone the repository and install dependencies for all workspaces:

```bash
git clone [https://github.com/sdiv0503/insight-zero.git](https://github.com/sdiv0503/insight-zero.git)
cd insight-zero

# Install Node dependencies
npm install

# Setup Python Engine
cd apps/engine
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

###  3. Environment Variables
Create .env files in the respective directories based on the .env.example templates.

* apps/web/.env.local: Clerk Keys
* apps/api/.env: Redis URL, Clerk Secret
* apps/engine/.env: Pinecone API Key, Groq API Key

### 4. Running the Platform
Start the microservices in separate terminals:

Terminal 1 (Next.js Frontend):

``` bash
cd apps/web
npm run dev
```
Terminal 2 (Node.js Gateway):

``` bash
cd apps/api
npx ts-node src/index.ts
```
Terminal 3 (Python AI Engine):

``` bash
cd apps/engine
uvicorn main:app --reload --port 8000
```

### 👨‍💻 Author
**Divyansh Sharma**

**GitHub**: @sdiv0503

**Email**: sdivyansh0503@gmail.com

Developed as a Final Year Capstone Project — 2026


---