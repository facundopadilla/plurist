import { useState, useEffect } from "react";
import { useCanvasStore } from "../canvas-store";
import { fetchProjectSources, fetchSources } from "../../design-bank/api";
import type { DesignBankSource } from "../../design-bank/types";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  image: "imagen",
  color: "color",
  font: "fuente",
  text: "texto",
};

function SourceRow({ source }: { source: DesignBankSource }) {
  const label = SOURCE_TYPE_LABELS[source.source_type] ?? source.source_type;
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors">
      <span className="mt-0.5 shrink-0 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span
        className="flex-1 text-sm text-foreground truncate"
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
            err instanceof Error ? err.message : "Error al cargar recursos",
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
      className="flex flex-col h-full overflow-hidden"
      data-testid="resources-panel"
    >
      {/* Header */}
      <div className="h-10 flex items-center px-4 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-foreground">Recursos</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar recursos..."
          aria-label="Buscar recursos"
          className="w-full text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Cargando recursos...
          </p>
        )}

        {!isLoading && error && (
          <p className="text-xs text-destructive text-center mt-4 px-3">
            {error}
          </p>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4 px-3">
            {search.trim()
              ? "Sin resultados para tu búsqueda."
              : "No hay recursos en este proyecto."}
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
