import { ExternalLink } from "lucide-react";

interface SearchResultCardProps {
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
  index: number;
}

const getRelevanceColor = (score: number) => {
  if (score >= 0.8) return "text-emerald-400 bg-emerald-400/10 border-emerald-500/20";
  if (score >= 0.5) return "text-yellow-400 bg-yellow-400/10 border-yellow-500/20";
  return "text-orange-400 bg-orange-400/10 border-orange-500/20";
};

const getRelevanceLabel = (score: number) => {
  if (score >= 0.8) return "HIGH";
  if (score >= 0.5) return "MED";
  return "LOW";
};

const SearchResultCard = ({ title, url, snippet, relevanceScore, index }: SearchResultCardProps) => {
  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block glass-card rounded-xl p-5 pl-6 hover:border-emerald-500/20 transition-all duration-200 animate-fade-up result-accent"
      style={{ animationDelay: `${index * 0.06}s`, opacity: 0 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Domain */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono text-emerald-500/50 truncate">{domain}</span>
            <ExternalLink className="h-3 w-3 text-emerald-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {/* Title */}
          <h3 className="text-[15px] font-medium text-foreground group-hover:text-emerald-400 transition-colors line-clamp-1">
            {title}
          </h3>
          {/* Snippet */}
          <p
            className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed [&>b]:text-foreground [&>b]:font-medium"
            dangerouslySetInnerHTML={{ __html: snippet }}
          />
        </div>
        {/* Relevance score */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${getRelevanceColor(relevanceScore)}`}>
            {(relevanceScore * 100).toFixed(0)}%
          </span>
          <span className={`text-[9px] font-mono tracking-widest ${getRelevanceColor(relevanceScore).split(' ')[0]}`}>
            {getRelevanceLabel(relevanceScore)}
          </span>
        </div>
      </div>
    </a>
  );
};

export default SearchResultCard;
