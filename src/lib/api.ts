import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevance_score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface AISummaryResponse {
  summary: string;
}

export async function searchContent(query: string, limit = 10): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Search failed" }));
    throw new Error(err.detail || "Search failed");
  }

  return res.json();
}

export async function getAISummary(query: string, results: SearchResult[]): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/ai-summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, results }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Summary failed" }));
    throw new Error(err.detail || "Summary failed");
  }

  const data: AISummaryResponse = await res.json();
  return data.summary;
}

export async function crawlUrl(url: string) {
  const res = await fetch(`${API_BASE_URL}/api/crawl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Crawl failed" }));
    throw new Error(err.detail || "Crawl failed");
  }

  return res.json();
}

export async function getIndexedCount(): Promise<number> {
  // This still uses Supabase client directly (simple DB count query)
  const { count } = await supabase
    .from("processed_content")
    .select("*", { count: "exact", head: true });
  return count || 0;
}
