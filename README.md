# TrickTask 🚀

AI-powered project management platform that transforms raw requirements into actionable, assigned tasks — with a RAG-powered chat assistant for querying project knowledge.

![CI](https://github.com/Punyisa-m/ticktask/actions/workflows/ci.yml/badge.svg)

## What is this?

TrickTask is a full-stack web application where a team lead uploads project requirements (in plain text), and an LLM automatically breaks them into structured, assignable tasks — recommending the best team member for each task based on skill match and current workload. Team members then track progress on a Kanban board, and anyone can ask an AI chat assistant questions about the project, grounded in the actual requirement documents via RAG.

## Problem → Solution

| Problem | Solution |
|---|---|
| Team leads waste hours manually reading requirements and breaking them into tasks | AI reads the requirement text and generates structured tasks (title, description, priority, estimated hours) automatically |
| Assigning tasks to the "right" person is guesswork | AI recommends an assignee per task based on team members' skills and current workload, with a stated reason |
| Team members ask the same questions about requirements repeatedly | A RAG-powered chat lets anyone query project requirements in natural language, with confidence scoring to avoid hallucinated answers |
| One person/company can have multiple isolated teams | Role-based multi-tenant system (Superadmin → Department Head → Member) keeps departments' data isolated |

## Demo / Screenshots

> Full setup instructions are in [How to Run](#how-to-run).

| Login | Dashboard |
|---|---|
| ![Login](docs/screenshots/login.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| AI Requirement Analysis | Kanban Board |
|---|---|
| ![Requirement Analysis](docs/screenshots/requirement-analysis.png) | ![Kanban](docs/screenshots/kanban.png) |

| AI Chat (RAG) | Team Management |
|---|---|
| ![AI Chat](docs/screenshots/ai-chat.png) | ![Team](docs/screenshots/team.png) |


## Architecture

```mermaid
graph TD
    A[React Frontend] -->|REST + JWT| B[FastAPI Backend]
    B --> C[(PostgreSQL + pgvector)]
    B --> D[Typhoon LLM API]
    B --> E[sentence-transformers<br/>local embeddings]
    E --> C
    D --> B
```

- **Frontend**: React SPA, calls backend REST API directly, stores JWT in localStorage
- **Backend**: FastAPI monolith with role-based route guards, talks to PostgreSQL via SQLAlchemy
- **Vector storage**: pgvector extension inside the same PostgreSQL instance — no separate vector DB service
- **LLM calls**: OpenAI-compatible client pointed at Typhoon API (easy to swap providers)
- **Embeddings**: generated locally via `sentence-transformers` (no external embedding API cost)

## AI / RAG Workflow

```mermaid
sequenceDiagram
    participant U as Manager
    participant F as Frontend
    participant B as Backend
    participant L as Typhoon LLM
    participant V as pgvector

    U->>F: Upload requirement text
    F->>B: POST /requirements
    B->>V: Chunk + embed + store vectors
    U->>F: Click "Analyze with AI"
    F->>B: POST /analyze
    B->>L: Prompt: break requirement into tasks (JSON)
    L-->>B: Structured task list
    B->>L: Prompt: recommend assignee per task
    L-->>B: user_id + reason per task
    B-->>F: Suggested tasks + assignees
    U->>F: Review, edit, confirm
    F->>B: POST /confirm
    B->>B: Persist tasks to DB

    U->>F: Ask question in chat
    F->>B: POST /chat
    B->>B: Classify intent (question vs. greeting)
    B->>V: Embed question, cosine similarity search (top-k)
    V-->>B: Relevant requirement chunks + scores
    alt confidence below threshold
        B-->>F: "Not enough information" message
    else confident
        B->>L: Prompt with retrieved context
        L-->>B: Grounded answer
        B-->>F: Answer + source chunks + relevance %
    end
```

**Key design decisions:**
- **Human-in-the-loop**: AI suggestions (tasks, assignments) are never auto-committed — a manager must review and confirm first
- **Confidence-gated RAG**: if the best-matching chunk's similarity score is below a threshold, the system admits uncertainty instead of guessing
- **Intent classification**: a lightweight LLM call filters out greetings/small talk before running the full RAG pipeline, saving compute

## Tech Stack

**Backend:** FastAPI · SQLAlchemy · PostgreSQL (Supabase) · pgvector · JWT (python-jose) · bcrypt  
**AI:** Typhoon API (OpenAI-compatible) · sentence-transformers (`paraphrase-multilingual-MiniLM-L12-v2`)  
**Frontend:** React · React Router · Tailwind CSS  
**DevOps:** Docker · Docker Compose · GitHub Actions CI

## How to Run

### Prerequisites

- Docker & Docker Compose
- A PostgreSQL database with the `pgvector` extension enabled (e.g. free tier on [Supabase](https://supabase.com))
- A [Typhoon API](https://opentyphoon.ai) key (free)

### Setup

```bash
git clone https://github.com/Punyisa-m/ticktask.git
cd ticktask
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
TYPHOON_API_KEY=your_typhoon_key
SECRET_KEY=any_long_random_string
```

Run everything:

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API docs (Swagger): http://localhost:8000/docs

### Running locally without Docker

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Project Structure

```
ticktask/
├── backend/
│   ├── app/
│   │   ├── models/       # SQLAlchemy models
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # AI + RAG business logic
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       └── api/
└── docker-compose.yml
```