import os
import re
import asyncio
import traceback
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# FastAPI app
app = FastAPI(title="SCOUT API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USER_AGENT = "SCOUT/1.0 (https://github.com/SCOUT-engine; scout@example.com) Python/httpx"


# ─── Pydantic Models ───────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    limit: int = 10


class CrawlRequest(BaseModel):
    url: str


class SearchResultItem(BaseModel):
    id: str
    title: str
    url: str
    snippet: str
    relevance_score: float


class SummarizeRequest(BaseModel):
    query: str
    results: list[dict]


# ─── Helper Functions ──────────────────────────────────────────
def strip_html(html: str) -> str:
    """Remove HTML tags and entities, return clean text."""
    soup = BeautifulSoup(html, "html.parser")
    # Remove script and style elements
    for element in soup(["script", "style"]):
        element.decompose()
    text = soup.get_text(separator=" ")
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_title(html: str) -> str:
    """Extract <title> text from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    title_tag = soup.find("title")
    return title_tag.get_text(strip=True) if title_tag else "Untitled"


async def crawl_and_index(url: str) -> bool:
    """Fetch a URL, parse HTML, store in Supabase DB, and update search tokens."""
    try:
        print(f"Auto-crawling: {url}")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)
        if response.status_code != 200:
            return False

        html = response.text
        title = extract_title(html)
        domain = httpx.URL(url).host

        # Upsert raw content
        raw_result = supabase.table("raw_content").upsert(
            {"url": url, "title": title, "html_content": html, "source_domain": domain},
            on_conflict="url",
        ).execute()

        if not raw_result.data:
            print(f"Raw insert error for {url}")
            return False

        raw_id = raw_result.data[0]["id"]
        clean_text = strip_html(html)
        word_count = len(clean_text.split())

        # Upsert processed content
        supabase.table("processed_content").upsert(
            {
                "raw_id": raw_id,
                "url": url,
                "title": title,
                "clean_text": clean_text[:50000],  # Limit size
                "tokens": None,
                "word_count": word_count,
            },
            on_conflict="raw_id",
        ).execute()

        # Update tsvector tokens
        supabase.rpc("update_tokens_for_url", {"target_url": url}).execute()
        print(f"Auto-crawled successfully: {title}")
        return True
    except Exception as e:
        print(f"Auto-crawl failed for {url}: {e}")
        traceback.print_exc()
        return False


async def find_and_crawl_wikipedia(query: str) -> int:
    """Search Wikipedia for relevant articles and crawl them."""
    try:
        search_url = (
            f"https://en.wikipedia.org/w/api.php"
            f"?action=opensearch&search={query}&limit=5&format=json"
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(search_url, headers={"User-Agent": USER_AGENT})
        if res.status_code != 200:
            return 0

        data = res.json()
        urls: list[str] = data[3] if len(data) > 3 else []
        if not urls:
            return 0

        print(f'Found {len(urls)} Wikipedia articles for "{query}"')

        # Crawl up to 3 articles concurrently
        tasks = [crawl_and_index(url) for url in urls[:3]]
        results = await asyncio.gather(*tasks)
        return sum(1 for r in results if r)
    except Exception as e:
        print(f"Wikipedia search failed: {e}")
        traceback.print_exc()
        return 0


# ─── API Endpoints ─────────────────────────────────────────────
@app.post("/api/search")
async def search(req: SearchRequest):
    """Full-text search with auto-crawl fallback."""
    if not req.query:
        raise HTTPException(status_code=400, detail="Query is required")

    # Log the search query
    supabase.table("search_queries").insert({"query_text": req.query}).execute()

    # Search using database function
    result = supabase.rpc(
        "search_content",
        {"search_query": req.query, "result_limit": req.limit},
    ).execute()

    results = result.data or []

    # If no results, auto-crawl from Wikipedia and re-search
    if not results:
        print(f'No results for "{req.query}", auto-crawling from Wikipedia...')
        crawled = await find_and_crawl_wikipedia(req.query)

        if crawled > 0:
            print(f"Crawled {crawled} pages, re-searching...")
            retry_result = supabase.rpc(
                "search_content",
                {"search_query": req.query, "result_limit": req.limit},
            ).execute()

            retry_results = retry_result.data or []
            if retry_results:
                max_score = max((r["relevance_score"] for r in retry_results), default=0.001)
                normalized = [
                    {**r, "relevance_score": min(r["relevance_score"] / max_score, 1)}
                    for r in retry_results
                ]
                return {"results": normalized, "total": len(normalized), "auto_crawled": True}

        return {"results": [], "total": 0, "auto_crawled": crawled > 0}

    # Normalize relevance scores
    max_score = max((r["relevance_score"] for r in results), default=0.001)
    normalized = [
        {**r, "relevance_score": min(r["relevance_score"] / max_score, 1)}
        for r in results
    ]

    # Update result count (fire-and-forget)
    try:
        supabase.table("search_queries").update({"result_count": len(results)}).eq(
            "query_text", req.query
        ).execute()
    except Exception:
        pass

    return {"results": normalized, "total": len(normalized)}


@app.post("/api/crawl")
async def crawl(req: CrawlRequest):
    """Crawl a URL, parse it, and index it for search."""
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(req.url, headers={"User-Agent": USER_AGENT}, follow_redirects=True)

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to fetch URL: {response.status_code}",
            )

        html = response.text
        title = extract_title(html)
        domain = httpx.URL(req.url).host

        # Store raw content
        raw_result = supabase.table("raw_content").upsert(
            {"url": req.url, "title": title, "html_content": html, "source_domain": domain},
            on_conflict="url",
        ).execute()

        if not raw_result.data:
            raise HTTPException(status_code=500, detail="Failed to store raw content")

        raw_id = raw_result.data[0]["id"]
        clean_text = strip_html(html)
        word_count = len(clean_text.split())

        # Upsert processed content
        supabase.table("processed_content").upsert(
            {
                "raw_id": raw_id,
                "url": req.url,
                "title": title,
                "clean_text": clean_text[:50000],
                "tokens": None,
                "word_count": word_count,
            },
            on_conflict="raw_id",
        ).execute()

        # Update tsvector tokens
        supabase.rpc("update_tokens_for_url", {"target_url": req.url}).execute()

        return {"success": True, "title": title, "url": req.url, "word_count": word_count}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai-summarize")
async def ai_summarize(req: SummarizeRequest):
    """Generate an AI summary of search results using Google Gemini."""
    if not req.query or not req.results:
        raise HTTPException(status_code=400, detail="Query and results required")

    if not gemini_client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured in backend/.env")

    try:
        # Take top 3 results for summary
        top_results = req.results[:3]
        context = "\n\n".join(
            f"[Source {i + 1}: {r.get('title', 'Untitled')}]\n{r.get('snippet', '')}"
            for i, r in enumerate(top_results)
        )

        prompt = (
            f'Search query: "{req.query}"\n\n'
            f"Search results:\n{context}"
        )

        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=(
                    "You are a search engine AI assistant. Given a user's search query "
                    "and relevant search result snippets, generate a concise, informative "
                    "summary that directly answers the query. Use information from the "
                    "provided sources. Keep it to 2-3 sentences. Be factual and precise. "
                    "Do not use markdown formatting."
                ),
                max_output_tokens=256,
            ),
        )

        summary = response.text or "Unable to generate summary."
        return {"summary": summary}

    except Exception as e:
        print(f"Summarize error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/indexed-count")
async def indexed_count():
    """Return the count of indexed pages."""
    result = supabase.table("processed_content").select("id", count="exact").execute()
    return {"count": result.count or 0}
