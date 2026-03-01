import { Radar } from "lucide-react";

interface AISummaryCardProps {
  summary: string;
  sources: { title: string; url: string }[];
  isLoading?: boolean;
}

const AISummaryCard = ({ summary, sources, isLoading }: AISummaryCardProps) => {
  if (isLoading) {
    return (
      <div className="terminal-card rounded-xl p-5 animate-fade-up scan-line-effect">
        <div className="flex items-center gap-2 mb-4">
          <Radar className="h-4 w-4 text-emerald-400 animate-spin" />
          <span className="text-xs font-mono font-semibold text-emerald-400 tracking-wider uppercase">
            Analyzing intel...
          </span>
        </div>
        <div className="space-y-2.5">
          <div className="h-3.5 w-full shimmer rounded" />
          <div className="h-3.5 w-5/6 shimmer rounded" />
          <div className="h-3.5 w-4/6 shimmer rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card rounded-xl p-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="w-2 h-2 rounded-full bg-emerald-400/40" />
          <span className="w-2 h-2 rounded-full bg-emerald-400/20" />
        </div>
        <span className="text-xs font-mono font-semibold text-emerald-400 tracking-wider uppercase ml-1">
          Intel Summary
        </span>
      </div>

      {/* Summary text */}
      <p className="text-foreground/90 leading-relaxed text-[14px] font-mono">{summary}</p>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-emerald-500/10">
          <p className="text-[10px] font-mono text-emerald-500/40 tracking-widest uppercase mb-2">Sources</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono px-2.5 py-1 rounded-md border border-border bg-secondary/30 text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-400 transition-colors"
              >
                [{i + 1}] {source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISummaryCard;
