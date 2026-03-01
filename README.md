# 🔍 SCOUT — AI-Powered Search Engine

> **S**earch · **C**rawl · **O**utput · **U**nderstand · **T**ransform

SCOUT is a full-stack, AI-powered search engine that **crawls the web**, **indexes content** using PostgreSQL full-text search, and generates **AI-driven summaries** of search results using Google Gemini. If no results exist in the database, SCOUT **automatically discovers and crawls Wikipedia** articles in real-time, making it a self-expanding knowledge engine.

This document explains **everything** about this project — from high-level architecture to individual component details. After reading this, you should understand exactly how a search query flows through the entire system.

---

## 📑 Table of Contents

1.  [What Problem Does SCOUT Solve?](#1-what-problem-does-scout-solve)
2.  [Key Features](#2-key-features)
3.  [Tech Stack](#3-tech-stack)
4.  [System Architecture](#4-system-architecture)
5.  [Project Structure](#5-project-structure)
6.  [The Journey of a Search Query](#6-the-journey-of-a-search-query)
7.  [Database Design (PostgreSQL / Supabase)](#7-database-design-postgresql--supabase)
8.  [Deep Dive: The Backend (FastAPI)](#8-deep-dive-the-backend-fastapi)
9.  [Deep Dive: The Frontend (React)](#9-deep-dive-the-frontend-react)
10. [How Full-Text Search Works](#10-how-full-text-search-works)
11. [How AI Summarization Works](#11-how-ai-summarization-works)
12. [How Auto-Crawling Works](#12-how-auto-crawling-works)
13. [API Reference](#13-api-reference)
14. [Setup & Installation](#14-setup--installation)
15. [Environment Variables](#15-environment-variables)
16. [Running the Project](#16-running-the-project)
17. [Future Improvements](#17-future-improvements)

---

## 1. What Problem Does SCOUT Solve?

Traditional search engines are opaque — you type a query, get a list of blue links, and have to manually read through each page to find your answer. **SCOUT tackles this differently:**

```
┌──────────────┐      ┌────────────────┐      ┌──────────────────┐
│  User types  │      │    SCOUT       │      │   Results +      │
│  a search    │ ───► │  Backend       │ ───► │   AI Summary     │
│  query       │      │  - Crawl       │      │   shown to user  │
└──────────────┘      │  - Index       │      └──────────────────┘
                      │  - Search      │
                      │  - Summarize   │
                      └────────────────┘
```

| Problem | How SCOUT Solves It |
|---------|-------------------|
| No indexed content for a topic | **Auto-crawls** Wikipedia articles in real-time |
| Users must read each search result | **AI generates** a concise summary using Google Gemini |
| Search quality depends on exact keyword match | Uses **PostgreSQL tsvector** with linguistic stemming |
| Results lack context | **Relevance scoring** with color-coded confidence levels |
| Building a spider from scratch is hard | Uses **httpx + BeautifulSoup** for lightweight, async crawling |

---

## 2. Key Features

- 🕷️ **Web Crawler** — Fetches any URL, parses HTML, extracts clean text, and stores it in a PostgreSQL database
- 🔎 **Full-Text Search** — Uses PostgreSQL `tsvector` + `tsquery` with GIN indexes and trigram matching for fast, linguistically-aware search
- 🤖 **AI Summarization** — Sends top search results to Google Gemini 2.0 Flash to generate a concise, human-readable answer
- 🌐 **Wikipedia Auto-Crawl** — When no results exist for a query, SCOUT automatically searches Wikipedia's OpenSearch API, crawls up to 3 relevant articles, indexes them, and re-runs the search — all in a single request
- 📊 **Relevance Scoring** — Results are ranked using `ts_rank_cd` and normalized to 0–100% with color-coded badges (HIGH / MED / LOW)
- 🎯 **Search Analytics** — Every search query is logged to a `search_queries` table for analytics
- 🎨 **Radar-Themed UI** — A unique dark recon/radar aesthetic with animated radar sweep, scan-line effects, and glowing emerald accents

---

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | Component-based UI framework |
| **TypeScript** | Type safety across the entire frontend |
| **Vite** | Lightning-fast dev server and build tool |
| **Tailwind CSS** | Utility-first styling with custom theme |
| **Radix UI** | Accessible, unstyled UI primitives (49 components) |
| **React Router v6** | Client-side routing (`/`, `/search`) |
| **TanStack React Query** | Server state management and caching |
| **Lucide React** | Icon library |
| **Recharts** | Data visualization components |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python 3.11+** | Backend language |
| **FastAPI** | Async REST API framework with auto-generated docs |
| **Uvicorn** | ASGI server for running FastAPI |
| **httpx** | Async HTTP client for web crawling |
| **BeautifulSoup4** | HTML parsing and text extraction |
| **Google GenAI SDK** | Google Gemini 2.0 Flash for AI summarization |
| **Supabase Python SDK** | PostgreSQL database client |

### Database & Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Supabase** | Hosted PostgreSQL with REST API and auth |
| **PostgreSQL** | Core database with full-text search extensions |
| **pg_trgm** | Trigram-based fuzzy text matching |
| **tsvector / tsquery** | Native PostgreSQL full-text search |
| **GIN Index** | Generalized Inverted Index for fast text search |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                   │
│                        React + Vite + TypeScript                        │
│                                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────────┐   │
│  │  Index Page  │    │ Search Page  │    │     Components            │   │
│  │  (Landing)   │    │  (Results)   │    │  - SearchBar              │   │
│  │  - Radar UI  │    │  - Results   │    │  - SearchResultCard       │   │
│  │  - Search    │    │  - AI Card   │    │  - AISummaryCard          │   │
│  └──────┬───────┘    └──────┬───────┘    └───────────────────────────┘   │
│         │                   │                                           │
│         └───────┬───────────┘                                           │
│                 │  HTTP (fetch)                                          │
│                 ▼                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                              BACKEND                                    │
│                     Python FastAPI (Uvicorn)                             │
│                                                                         │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────────────┐   │
│  │  /api/search  │  │  /api/crawl   │  │  /api/ai-summarize         │   │
│  │              │  │               │  │                             │   │
│  │  Full-text   │  │  Fetch URL    │  │  Google Gemini 2.0 Flash   │   │
│  │  search +    │  │  Parse HTML   │  │  Summarize top 3 results   │   │
│  │  auto-crawl  │  │  Index text   │  │                             │   │
│  └──────┬───────┘  └───────┬───────┘  └──────────┬──────────────────┘   │
│         │                  │                     │                      │
│         └────────┬─────────┘                     │                      │
│                  │                               │                      │
│                  ▼                               ▼                      │
│  ┌───────────────────────┐        ┌──────────────────────────────┐      │
│  │    Supabase           │        │    Google Gemini API          │      │
│  │    (PostgreSQL)       │        │    (gemini-2.0-flash)         │      │
│  │                       │        └──────────────────────────────┘      │
│  │  - raw_content        │                                              │
│  │  - processed_content  │                                              │
│  │  - search_queries     │                                              │
│  └───────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Project Structure

```
scout/
├── backend/                        # Python FastAPI backend
│   ├── main.py                     # ★ All API endpoints & crawling logic
│   ├── init.sql                    # Database schema (SQL)
│   ├── requirements.txt            # Python dependencies
│   └── .env                        # Backend environment variables
│
├── src/                            # React frontend source
│   ├── main.tsx                    # App entry point
│   ├── App.tsx                     # Router setup (/ and /search)
│   ├── index.css                   # Global styles + radar animations
│   │
│   ├── pages/
│   │   ├── Index.tsx               # ★ Landing page (radar + search bar)
│   │   ├── SearchPage.tsx          # ★ Search results + AI summary
│   │   └── NotFound.tsx            # 404 page
│   │
│   ├── components/
│   │   ├── SearchBar.tsx           # Search input with suggestions
│   │   ├── SearchResultCard.tsx    # Individual result with relevance badge
│   │   ├── AISummaryCard.tsx       # AI-generated summary display
│   │   └── ui/                     # 49 Radix UI primitives (shadcn/ui)
│   │
│   ├── lib/
│   │   ├── api.ts                  # Frontend API client (fetch wrappers)
│   │   └── utils.ts                # Utility functions (cn helper)
│   │
│   ├── hooks/
│   │   ├── use-toast.ts            # Toast notification hook
│   │   └── use-mobile.tsx          # Mobile detection hook
│   │
│   └── integrations/
│       └── supabase/               # Supabase client configuration
│
├── index.html                      # HTML entry point
├── package.json                    # Node.js dependencies & scripts
├── vite.config.ts                  # Vite configuration
├── tailwind.config.ts              # Tailwind CSS theme customization
├── tsconfig.json                   # TypeScript configuration
├── vitest.config.ts                # Test configuration
└── .env                            # Frontend environment variables
```

---

## 6. The Journey of a Search Query

Let's trace exactly what happens when a user searches for **"machine learning"**:

### Step 1: User Submits Query (Frontend)
```
SearchBar.tsx → onSearch("machine learning")
  → navigate("/search?q=machine%20learning")
```
The `SearchBar` component captures the input and navigates to the search page with the query as a URL parameter.

### Step 2: Search Page Triggers API Call
```
SearchPage.tsx → useEffect detects query change
  → searchContent("machine learning")
    → POST http://localhost:8000/api/search
       Body: { "query": "machine learning", "limit": 10 }
```
The `searchContent()` function in `api.ts` sends a POST request to the FastAPI backend.

### Step 3: Backend Receives Request
```python
# main.py → search()
@app.post("/api/search")
async def search(req: SearchRequest):
    # 1. Log the query to search_queries table
    supabase.table("search_queries").insert({"query_text": req.query})

    # 2. Call PostgreSQL full-text search function
    result = supabase.rpc("search_content", {
        "search_query": req.query,
        "result_limit": req.limit
    })
```

### Step 4: PostgreSQL Full-Text Search Executes
```sql
-- The search_content() function runs:
SELECT pc.id, pc.url, pc.title,
       ts_headline('english', pc.clean_text, query, 'MaxWords=60,MinWords=20') AS snippet,
       ts_rank_cd(pc.tokens, query, 32) AS relevance_score
FROM processed_content pc
WHERE pc.tokens @@ plainto_tsquery('english', 'machine learning')
   OR pc.title ILIKE '%machine learning%'
ORDER BY relevance_score DESC
LIMIT 10;
```

**What happens internally:**
1. `plainto_tsquery('english', 'machine learning')` → converts to `'machin' & 'learn'` (stemmed tokens)
2. The `@@` operator checks which documents' `tsvector` tokens match the query
3. `ts_rank_cd` computes a relevance score based on token density and position
4. `ts_headline` generates highlighted snippets with `<b>` tags around matched terms

### Step 5: If No Results → Auto-Crawl Wikipedia
```python
if not results:
    # Search Wikipedia's OpenSearch API
    # GET https://en.wikipedia.org/w/api.php?action=opensearch&search=machine+learning&limit=5

    # Returns URLs like:
    # ["https://en.wikipedia.org/wiki/Machine_learning",
    #  "https://en.wikipedia.org/wiki/Machine_learning_in_bioinformatics", ...]

    # Crawl up to 3 articles concurrently
    tasks = [crawl_and_index(url) for url in urls[:3]]
    results = await asyncio.gather(*tasks)

    # Re-run the search query
    retry_result = supabase.rpc("search_content", ...)
```

### Step 6: Results Returned + AI Summary Triggered
```
Backend returns:
{
  "results": [
    { "id": "...", "url": "...", "title": "Machine learning", "snippet": "...", "relevance_score": 0.85 },
    ...
  ],
  "total": 5,
  "auto_crawled": true
}
```
The frontend then immediately triggers a second API call for AI summarization:

### Step 7: AI Summarization via Google Gemini
```python
# main.py → ai_summarize()
prompt = f'Search query: "machine learning"\n\nSearch results:\n...'
response = gemini_client.models.generate_content(
    model="gemini-2.0-flash",
    contents=prompt,
    config=GenerateContentConfig(
        system_instruction="You are a search engine AI assistant...",
        max_output_tokens=256,
    ),
)
```

### Step 8: Everything Renders on Screen
```
SearchPage.tsx renders:
  ├── Status bar → "5 results // auto-crawled for 'machine learning'"
  ├── AISummaryCard → AI-generated concise answer
  └── SearchResultCard[] → Individual results with relevance badges
         └── Each card shows: domain, title, snippet, relevance %
```

---

## 7. Database Design (PostgreSQL / Supabase)

### Entity Relationship Diagram
```
┌──────────────────────┐         ┌──────────────────────────┐
│     raw_content      │         │    processed_content     │
├──────────────────────┤         ├──────────────────────────┤
│ id (UUID, PK)        │◄───────┤│ raw_id (UUID, FK, UQ)    │
│ url (TEXT, UNIQUE)    │  1:1   │ id (UUID, PK)            │
│ title (TEXT)          │         │ url (TEXT)               │
│ html_content (TEXT)   │         │ title (TEXT)             │
│ source_domain (TEXT)  │         │ clean_text (TEXT)        │
│ crawled_at (TIMESTZ)  │         │ tokens (TSVECTOR)        │  ◄─── GIN Index
└──────────────────────┘         │ word_count (INTEGER)     │
                                 │ processed_at (TIMESTZ)    │
                                 └──────────────────────────┘

┌──────────────────────┐
│    search_queries    │
├──────────────────────┤
│ id (UUID, PK)        │
│ query_text (TEXT)     │
│ result_count (INT)   │
│ created_at (TIMESTZ)  │
└──────────────────────┘
```

### Why This Design?

| Decision | Reasoning |
|----------|-----------|
| **Separate raw & processed tables** | Keeps original HTML intact for re-processing; clean text is derived and can be regenerated |
| **`tsvector` column** | Pre-computed search tokens avoid expensive runtime computation on every query |
| **GIN index on tokens** | Generalized Inverted Index — optimized for `@@` (text search) operator; O(1) lookup instead of full table scan |
| **Trigram index on title** | Enables fuzzy `ILIKE` matching on titles even when full-text search doesn't match |
| **`ON DELETE CASCADE`** | Deleting a `raw_content` row automatically cleans up its `processed_content` |
| **`UPSERT` with `ON CONFLICT`** | Re-crawling the same URL updates the existing row instead of duplicating |

---

## 8. Deep Dive: The Backend (FastAPI)

The entire backend lives in a single file: `backend/main.py` (332 lines).

### Request Flow

```python
# Pydantic models enforce request validation
class SearchRequest(BaseModel):
    query: str          # Required search query
    limit: int = 10     # Optional, defaults to 10

class CrawlRequest(BaseModel):
    url: str            # URL to crawl

class SummarizeRequest(BaseModel):
    query: str          # Original query for context
    results: list[dict] # Search results to summarize
```

### HTML Parsing Pipeline

When SCOUT crawls a URL, this is the text extraction pipeline:

```
Raw HTML → BeautifulSoup → Remove <script>/<style> → Get text → Collapse whitespace
```

```python
def strip_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for element in soup(["script", "style"]):
        element.decompose()          # Remove JS and CSS
    text = soup.get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()  # Collapse whitespace
    return text
```

### Concurrent Crawling with `asyncio.gather`

When auto-crawling Wikipedia, SCOUT fetches multiple pages **concurrently** using `asyncio.gather`:

```python
tasks = [crawl_and_index(url) for url in urls[:3]]
results = await asyncio.gather(*tasks)  # All 3 pages crawl simultaneously
```

This means 3 Wikipedia articles are fetched, parsed, and indexed **in parallel** — not sequentially.

### CORS Configuration

The backend allows requests from any origin during development:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 9. Deep Dive: The Frontend (React)

### Routing

| Route | Page | Description |
|-------|------|-------------|
| `/` | `Index.tsx` | Landing page with radar animation and search bar |
| `/search?q=...` | `SearchPage.tsx` | Search results with AI summary |
| `*` | `NotFound.tsx` | 404 fallback |

### Component Hierarchy

```
App.tsx
├── QueryClientProvider (TanStack React Query)
├── TooltipProvider (Radix UI)
├── BrowserRouter
│   ├── Route "/" → Index
│   │   ├── Radar Animation (CSS)
│   │   ├── SearchBar
│   │   └── FeaturePills (AI Summaries, Auto-Crawl, Web Indexing)
│   │
│   ├── Route "/search" → SearchPage
│   │   ├── Header (Logo + SearchBar compact mode)
│   │   ├── Status Bar (result count, auto-crawl indicator)
│   │   ├── AISummaryCard
│   │   │   ├── Loading state (shimmer + scan-line effect)
│   │   │   ├── Summary text
│   │   │   └── Source links [1] [2] [3]
│   │   │
│   │   └── SearchResultCard[] (mapped from results)
│   │       ├── Domain name
│   │       ├── Title (emerald hover)
│   │       ├── Snippet (with <b> highlighted terms)
│   │       └── Relevance badge (HIGH/MED/LOW + percentage)
│   │
│   └── Route "*" → NotFound
```

### Search Suggestions

The `SearchBar` component includes a built-in suggestion system:

```typescript
const suggestions = [
  "machine learning",
  "artificial intelligence",
  "deep learning neural networks",
  "natural language processing",
  "computer vision",
  "Python programming",
  "PostgreSQL database",
];
```

Suggestions are filtered as the user types and displayed in a dropdown.

### Relevance Score Visualization

Results use a color-coded system based on the normalized relevance score:

| Score Range | Label | Color |
|-------------|-------|-------|
| ≥ 80% | **HIGH** | 🟢 Emerald |
| ≥ 50% | **MED** | 🟡 Yellow |
| < 50% | **LOW** | 🟠 Orange |

---

## 10. How Full-Text Search Works

PostgreSQL's full-text search is the core of SCOUT's search capability. Here's how it works under the hood:

### 1. Indexing (When a page is crawled)

```sql
-- Convert title + clean_text into a tsvector (searchable token vector)
UPDATE processed_content
SET tokens = to_tsvector('english',
    coalesce(title, '') || ' ' || coalesce(clean_text, '')
)
WHERE url = 'https://example.com';
```

**Example:**
```
Input:  "Machine Learning is a subset of Artificial Intelligence"
Output: 'artifici':8 'intellig':9 'learn':2 'machin':1 'subset':5
```

Notice: words are **stemmed** (`learning` → `learn`, `artificial` → `artifici`), and stop words (`is`, `a`, `of`) are removed.

### 2. Searching (When a user queries)

```sql
plainto_tsquery('english', 'machine learning')
-- Produces: 'machin' & 'learn'
```

The `@@` operator checks if a document's tsvector contains all the query tokens.

### 3. Ranking

```sql
ts_rank_cd(tokens, query, 32)
-- Returns a float representing relevance
-- The "32" flag divides rank by (1 + log(document_length))
-- This normalizes for document length so short and long documents are treated fairly
```

### 4. Snippet Generation

```sql
ts_headline('english', clean_text, query, 'MaxWords=60,MinWords=20')
-- Generates: "...<b>Machine</b> <b>learning</b> is a subset of artificial intelligence..."
```

---

## 11. How AI Summarization Works

```
[Search Results]  ──►  [Prompt Construction]  ──►  [Gemini 2.0 Flash]  ──►  [Summary]
```

### Prompt Template

The system sends the top 3 search results to Gemini with this structure:

```
System: "You are a search engine AI assistant. Given a user's search query
         and relevant search result snippets, generate a concise, informative
         summary that directly answers the query. Use information from the
         provided sources. Keep it to 2-3 sentences. Be factual and precise.
         Do not use markdown formatting."

User:   Search query: "machine learning"

        Search results:
        [Source 1: Machine learning - Wikipedia]
        Machine learning (ML) is a field of study in artificial intelligence...

        [Source 2: What is Machine Learning?]
        Machine learning is the study of computer algorithms that can improve...
```

### Why Gemini 2.0 Flash?

| Feature | Value |
|---------|-------|
| Speed | ~1-2 seconds response time |
| Cost | Free tier available |
| Token Limit | 256 output tokens (keeps summaries concise) |
| Quality | Strong factual accuracy for summarization tasks |

---

## 12. How Auto-Crawling Works

This is SCOUT's most distinctive feature — **zero-result queries trigger automatic knowledge acquisition.**

```
User searches "quantum computing"
       │
       ▼
  Search database → 0 results
       │
       ▼
  Query Wikipedia OpenSearch API
  GET /w/api.php?action=opensearch&search=quantum+computing&limit=5
       │
       ▼
  Returns: [
    "https://en.wikipedia.org/wiki/Quantum_computing",
    "https://en.wikipedia.org/wiki/Quantum_supremacy",
    "https://en.wikipedia.org/wiki/Quantum_algorithm"
  ]
       │
       ▼
  Crawl all 3 URLs concurrently (asyncio.gather)
       │
       ├── Fetch HTML (httpx async)
       ├── Extract title (BeautifulSoup)
       ├── Strip HTML to clean text
       ├── Store in raw_content table (UPSERT)
       ├── Store in processed_content table (UPSERT)
       └── Update tsvector tokens (RPC call)
       │
       ▼
  Re-run the original search query → now returns results!
       │
       ▼
  Response includes: { "auto_crawled": true }
  Frontend shows: "5 results // auto-crawled"
```

---

## 13. API Reference

### `POST /api/search`
Full-text search with auto-crawl fallback.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✅ | — | Search query text |
| `limit` | int | ❌ | 10 | Max results to return |

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "url": "https://...",
      "title": "Page Title",
      "snippet": "...highlighted <b>text</b>...",
      "relevance_score": 0.85
    }
  ],
  "total": 5,
  "auto_crawled": false
}
```

---

### `POST /api/crawl`
Manually crawl and index a URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | URL to crawl |

**Response:**
```json
{
  "success": true,
  "title": "Page Title",
  "url": "https://...",
  "word_count": 5420
}
```

---

### `POST /api/ai-summarize`
Generate an AI summary of search results.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | ✅ | Original search query |
| `results` | list | ✅ | Array of search result objects |

**Response:**
```json
{
  "summary": "Machine learning is a subset of artificial intelligence that enables..."
}
```

---

### `GET /api/indexed-count`
Returns the total number of indexed pages.

**Response:**
```json
{
  "count": 42
}
```

---

## 14. Setup & Installation

### Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **Python** | 3.11+ | `python --version` |
| **pip** | Latest | `pip --version` |
| **Supabase Account** | Free tier | [supabase.com](https://supabase.com) |
| **Google AI Studio** | Free API key | [aistudio.google.com](https://aistudio.google.com) |

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/scout.git
cd scout
```

### 2. Set Up the Database

1. Create a new project on [Supabase](https://supabase.com)
2. Go to the **SQL Editor** in your Supabase dashboard
3. Copy and paste the contents of `backend/init.sql` and run it
4. This creates: `raw_content`, `processed_content`, `search_queries` tables + search functions + indexes

### 3. Install Frontend Dependencies

```bash
npm install
```

### 4. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

## 15. Environment Variables

### Frontend (`/.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:8000
```

### Backend (`/backend/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-google-gemini-api-key
```

> ⚠️ **Never commit `.env` files to git.** Both are included in `.gitignore`.

---

## 16. Running the Project

### Start the Backend

```bash
cd backend
python -m uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. FastAPI auto-generates interactive docs at `http://localhost:8000/docs`.

### Start the Frontend

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Both Running Together

You need **two terminals**: one for the backend, one for the frontend.

```
Terminal 1:  cd backend && python -m uvicorn main:app --reload
Terminal 2:  npm run dev
```

---

## 17. Future Improvements

| Improvement | Description |
|-------------|-------------|
| **Semantic Search** | Replace keyword search with vector embeddings (e.g., OpenAI/Cohere embeddings + pgvector) |
| **Scheduled Crawling** | Periodically re-crawl indexed pages to keep content fresh |
| **User Authentication** | Supabase Auth for personalized search history |
| **Crawl Queue** | Background job queue (Celery/RQ) for crawling large sites |
| **Search Filters** | Filter by domain, date range, or content type |
| **Multilingual Support** | Use language detection + language-specific tsvector configs |
| **Rate Limiting** | Protect the API from abuse with token bucket rate limiting |
| **Caching Layer** | Redis caching for frequently searched queries |
| **Docker Deployment** | Containerize both frontend and backend for one-command deployment |

---

## Questions?

If you have questions about any part of this project, please open an issue or reach out!

---

<p align="center">
  <b>SCOUT</b> — Search · Crawl · Output · Understand · Transform<br>
  Built with React · FastAPI · Gemini · PostgreSQL
</p>
