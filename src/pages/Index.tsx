import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import { Search, Radar, Brain, Globe, Database } from "lucide-react";
import { getIndexedCount } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();
  const [indexedCount, setIndexedCount] = useState<number>(0);

  useEffect(() => {
    getIndexedCount().then(setIndexedCount).catch(console.error);
  }, []);

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background scout-grid-bg">
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-8 relative z-10">
        <div className="w-full max-w-2xl space-y-10 animate-fade-up">
          {/* Radar + Logo */}
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <div className="radar-container">
                <div className="radar-ring radar-ring-1" />
                <div className="radar-ring radar-ring-2" />
                <div className="radar-ring radar-ring-3" />
                <div className="radar-crosshair-h" />
                <div className="radar-crosshair-v" />
                <div className="radar-sweep" />
                <div className="radar-center-dot" />
                <div className="radar-blip radar-blip-1" />
                <div className="radar-blip radar-blip-2" />
                <div className="radar-blip radar-blip-3" />

                {/* Logo centered on radar */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <h1 className="text-5xl md:text-6xl font-extrabold tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <span className="scout-gradient-text">SCOUT</span>
                  </h1>
                  <p className="text-xs font-mono text-emerald-500/60 tracking-[0.3em] mt-1 uppercase">
                    Recon Engine
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm font-mono text-muted-foreground tracking-wider">
              <span className="text-emerald-400/80">S</span>earch · <span className="text-emerald-400/80">C</span>rawl · <span className="text-emerald-400/80">O</span>utput · <span className="text-emerald-400/80">U</span>nderstand · <span className="text-emerald-400/80">T</span>ransform
            </p>
          </div>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} />

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-up-delay-1">
            <FeaturePill icon={<Brain className="h-3.5 w-3.5" />} label="AI Summaries" />
            <FeaturePill icon={<Radar className="h-3.5 w-3.5" />} label="Auto-Crawl" />
            <FeaturePill icon={<Globe className="h-3.5 w-3.5" />} label="Web Indexing" />
            {indexedCount > 0 && (
              <FeaturePill icon={<Database className="h-3.5 w-3.5" />} label={`${indexedCount} indexed`} active />
            )}
          </div>

          {/* Coord tags */}
          <div className="flex justify-center gap-8 animate-fade-up-delay-2">
            <span className="coord-tag">SYS:ONLINE</span>
            <span className="coord-tag">NODE:LOCAL</span>
            <span className="coord-tag">v1.0.0</span>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground/50 font-mono relative z-0">
        SCOUT // React + FastAPI + Gemini
      </footer>
    </div>
  );
};

const FeaturePill = ({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono tracking-wide border transition-colors ${active
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
    : "border-border bg-secondary/50 text-muted-foreground hover:border-emerald-500/20 hover:text-emerald-400/70"
    }`}>
    {icon}
    {label}
  </div>
);

export default Index;
