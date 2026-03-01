# SCOUT — Search, Crawl, Output, Understand, Transform

An AI-powered search engine with intelligent summaries, full-text ranking, and web crawling.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Backend API | Python + FastAPI |
| Database | Supabase (PostgreSQL) |
| AI | Google Gemini 2.0 Flash (free tier) |

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free)

### 1. Set Up the Database

1. Create a new Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to the **SQL Editor** and paste the contents of `backend/init.sql`
3. Run the SQL to create all tables, indexes, and functions

### 2. Configure Environment Variables

**Frontend** (`.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

### 4. Start the Frontend

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:8080`.

## Project Structure

```
ai-insight-engine/
├── backend/
│   ├── main.py            # FastAPI server (search, crawl, AI summarize)
│   ├── requirements.txt    # Python dependencies
│   ├── init.sql            # Database schema (run in Supabase SQL Editor)
│   └── .env                # Backend secrets
├── src/
│   ├── pages/              # React pages (Index, SearchPage)
│   ├── components/         # UI components
│   ├── lib/api.ts          # Frontend API client
│   └── integrations/       # Supabase client
└── .env                    # Frontend env vars
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | Full-text search (auto-crawls Wikipedia if no results) |
| POST | `/api/crawl` | Crawl and index a URL |
| POST | `/api/ai-summarize` | AI summary using Gemini |
| GET | `/api/indexed-count` | Count of indexed pages |
