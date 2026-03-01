-- =============================================================
-- SCOUT Database Schema
-- Run this SQL in your new Supabase project's SQL Editor
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Table for raw crawled content
CREATE TABLE public.raw_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  html_content TEXT,
  source_domain TEXT,
  crawled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for processed/indexed content
CREATE TABLE public.processed_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_id UUID NOT NULL REFERENCES public.raw_content(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  clean_text TEXT NOT NULL,
  tokens TSVECTOR,
  word_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT processed_content_raw_id_unique UNIQUE (raw_id)
);

-- Create GIN indexes for full-text search
CREATE INDEX idx_processed_content_tokens ON public.processed_content USING GIN(tokens);
CREATE INDEX idx_processed_content_title_trgm ON public.processed_content USING GIN(title gin_trgm_ops);

-- Table for search query analytics
CREATE TABLE public.search_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access (no auth required)
ALTER TABLE public.raw_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read processed content" ON public.processed_content FOR SELECT USING (true);
CREATE POLICY "Anyone can read raw content" ON public.raw_content FOR SELECT USING (true);
CREATE POLICY "Anyone can insert search queries" ON public.search_queries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read search queries" ON public.search_queries FOR SELECT USING (true);

-- Function to update tsvector tokens for a given URL
CREATE OR REPLACE FUNCTION public.update_tokens_for_url(target_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.processed_content
  SET tokens = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(clean_text, ''))
  WHERE url = target_url;
END;
$$;

-- Function to search content using full-text search with ranking
CREATE OR REPLACE FUNCTION public.search_content(search_query TEXT, result_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  url TEXT,
  title TEXT,
  snippet TEXT,
  relevance_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsquery_val TSQUERY;
BEGIN
  tsquery_val := plainto_tsquery('english', search_query);

  RETURN QUERY
  SELECT
    pc.id,
    pc.url,
    pc.title,
    ts_headline('english', pc.clean_text, tsquery_val, 'MaxWords=60,MinWords=20') AS snippet,
    ts_rank_cd(pc.tokens, tsquery_val, 32)::REAL AS relevance_score
  FROM public.processed_content pc
  WHERE pc.tokens @@ tsquery_val
     OR pc.title ILIKE '%' || search_query || '%'
  ORDER BY
    CASE WHEN pc.tokens @@ tsquery_val THEN ts_rank_cd(pc.tokens, tsquery_val, 32) ELSE 0 END DESC,
    CASE WHEN pc.title ILIKE '%' || search_query || '%' THEN 1 ELSE 0 END DESC
  LIMIT result_limit;
END;
$$;
