import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import AISummaryCard from "@/components/AISummaryCard";
import SearchResultCard from "@/components/SearchResultCard";
import { searchContent, getAISummary, type SearchResult } from "@/lib/api";
import { Search, AlertCircle, Radar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const { toast } = useToast();

  const [isSearching, setIsSearching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [autoCrawled, setAutoCrawled] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q) return;
    setIsSearching(true);
    setSearchError("");
    setSummary("");
    setSummaryError("");
    setResults([]);
    setHasSearched(false);
    setAutoCrawled(false);

    try {
      const data = await searchContent(q);
      setResults(data.results);
      setAutoCrawled(!!(data as any).auto_crawled);
      setHasSearched(true);

      if (data.results.length > 0) {
        setIsSummarizing(true);
        try {
          const aiSummary = await getAISummary(q, data.results);
          setSummary(aiSummary);
        } catch (e: any) {
          console.error("Summary error:", e);
          setSummaryError("Unable to generate AI summary");
        } finally {
          setIsSummarizing(false);
        }
      }
    } catch (e: any) {
      console.error("Search error:", e);
      setSearchError(e.message || "Search failed");
      toast({ title: "Search Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  useEffect(() => {
    doSearch(query);
  }, [query, doSearch]);

  const handleSearch = (newQuery: string) => {
    navigate(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  return (
    <div className="min-h-screen bg-background scout-grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 rounded-lg search-gradient flex items-center justify-center signal-pulse">
              <Radar className="h-4 w-4 text-background" />
            </div>
            <span className="text-lg font-bold hidden sm:inline" style={{ fontFamily: "'Outfit', sans-serif" }}>
              <span className="scout-gradient-text">SCOUT</span>
            </span>
          </button>
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} initialQuery={query} compact isLoading={isSearching} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4 relative z-10">
        {query && (
          <>
            {/* Status Bar */}
            <div className="flex items-center gap-3">
              <p className="text-sm font-mono text-muted-foreground">
                {isSearching ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 signal-pulse" />
                    <span className="text-emerald-400/80">SCANNING</span>
                    <span className="text-muted-foreground/50">// crawling sources...</span>
                  </span>
                ) : hasSearched ? (
                  <span>
                    <span className="text-emerald-400/80">{results.length}</span>
                    {" "}result{results.length !== 1 ? "s" : ""}
                    {autoCrawled && <span className="text-muted-foreground/50"> // auto-crawled</span>}
                    {" "}for "<span className="text-foreground">{query}</span>"
                  </span>
                ) : null}
              </p>
            </div>

            {searchError && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-mono">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                ERR: {searchError}
              </div>
            )}

            {/* AI Summary */}
            {(isSummarizing || summary) && !summaryError && (
              <AISummaryCard
                summary={summary}
                sources={results.slice(0, 3).map((r) => ({
                  title: r.title.split(" - ")[0].split(" | ")[0],
                  url: r.url,
                }))}
                isLoading={isSummarizing}
              />
            )}

            {summaryError && hasSearched && results.length > 0 && (
              <div className="text-xs text-muted-foreground/50 font-mono italic">{summaryError}</div>
            )}

            {/* No results */}
            {hasSearched && results.length === 0 && !searchError && (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full border border-border flex items-center justify-center">
                  <Search className="h-7 w-7 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-mono text-sm">No targets found. Try a different query.</p>
              </div>
            )}

            {/* Result List */}
            {results.length > 0 && (
              <div className="space-y-2 pt-2">
                {results.map((result, i) => (
                  <SearchResultCard
                    key={result.id}
                    title={result.title}
                    url={result.url}
                    snippet={result.snippet}
                    relevanceScore={result.relevance_score}
                    index={i}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
