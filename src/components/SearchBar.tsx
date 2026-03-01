import { useState, useRef, useEffect } from "react";
import { Search, Loader2, Radar } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  compact?: boolean;
  isLoading?: boolean;
}

const suggestions = [
  "machine learning",
  "artificial intelligence",
  "deep learning neural networks",
  "natural language processing",
  "computer vision",
  "Python programming",
  "PostgreSQL database",
];

const SearchBar = ({ onSearch, initialQuery = "", compact = false, isLoading = false }: SearchBarProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full z-50">
      <div
        className={`relative flex items-center rounded-xl transition-all duration-300 bg-secondary/60 border border-border ${showSuggestions && filteredSuggestions.length > 0
          ? "search-glow rounded-b-none border-emerald-500/30"
          : "hover:border-emerald-500/20"
          } ${compact ? "h-11" : "h-14 md:h-16"}`}
      >
        {isLoading ? (
          <Radar className="absolute left-4 md:left-5 h-5 w-5 text-emerald-400 animate-spin" />
        ) : (
          <Search className="absolute left-4 md:left-5 h-5 w-5 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Enter search target..."
          className={`w-full bg-transparent outline-none pl-12 md:pl-14 pr-24 text-foreground placeholder:text-muted-foreground/60 font-mono ${compact ? "text-sm" : "text-sm md:text-base"
            }`}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-2 search-gradient text-background px-4 py-2 rounded-lg text-xs font-mono font-semibold tracking-wider uppercase transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Scan</span>
        </button>
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-card rounded-b-xl border border-t-0 border-emerald-500/20 overflow-hidden shadow-xl shadow-black/30">
          {filteredSuggestions.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSuggestionClick(suggestion)}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left text-sm font-mono text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
            >
              <Search className="h-3 w-3 text-emerald-500/40 flex-shrink-0" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

export default SearchBar;
