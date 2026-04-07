import { useState, useEffect } from "react";
import { useCanvasStore } from "../canvas-store";
import { fetchProjectSources, fetchSources } from "../../design-bank/api";
import type { DesignBankSource } from "../../design-bank/types";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  image: "image",
  color: "color",
  font: "font",
  text: "text",
};

function SourceRow({ source }: { source: DesignBankSource }) {
  const label = SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type;
  return (
    <div className="flex items-start gap-2.5 border-b border-zinc-900 px-4 py-3 transition-colors hover:bg-white/[0.03]">
      <span className="mt-0.5 inline-block shrink-0 rounded-md border border-zinc-800/70 bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <span
        className="flex-1 truncate text-sm text-zinc-200"
        title={source.name}
      >
        {source.name}
      </span>
    </div>
  );
}

export function ResourcesPanel() {
  const projectId = useCanvasStore((s) => s.config.projectId);

  const [sources, setSources] = useState<DesignBankSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const request =
      projectId != null ? fetchProjectSources(projectId) : fetchSources();

    request
      .then((data) => {
        if (!cancelled) {
          setSources(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load resources",
          );
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const filtered = search.trim()
    ? sources.filter((s) =>
        s.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : sources;

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      data-testid="resources-panel"
    >
      <div className="flex h-14 flex-shrink-0 items-center border-b border-zinc-800/60 px-4">
        <span className="text-sm font-semibold tracking-[-0.02em] text-zinc-50">
          Resources
        </span>
      </div>

      <div className="flex-shrink-0 border-b border-zinc-800/60 px-4 py-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          aria-label="Search resources"
          className="w-full rounded-lg border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-2 focus:ring-white/[0.04]"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <p className="mt-4 text-center text-xs text-zinc-500">
            Loading resources...
          </p>
        )}

        {!isLoading && error && (
          <p className="mt-4 px-3 text-center text-xs text-red-300">{error}</p>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <p className="mt-4 px-3 text-center text-xs text-zinc-500">
            {search.trim()
              ? "No results for this search."
              : "No resources in this project."}
          </p>
        )}

        {!isLoading &&
          !error &&
          filtered.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
      </div>
    </div>
  );
}
