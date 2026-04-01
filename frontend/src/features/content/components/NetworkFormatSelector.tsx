import { useQuery } from "@tanstack/react-query";
import { cn } from "../../../lib/utils";
import { fetchFormats } from "../../generation/api";

// Static fallback data (used while loading)
const NETWORKS = [
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X / Twitter" },
] as const;

type NetworkId = "instagram" | "linkedin" | "x";

interface NetworkFormatSelectorProps {
  formatKey: string;
  network: NetworkId | null;
  onFormatChange: (key: string, width: number, height: number) => void;
  onNetworkChange: (network: NetworkId) => void;
}

export function NetworkFormatSelector({
  formatKey,
  network,
  onFormatChange,
  onNetworkChange,
}: NetworkFormatSelectorProps) {
  const { data: formats = [] } = useQuery({
    queryKey: ["formats"],
    queryFn: fetchFormats,
    staleTime: Infinity, // Formats don't change at runtime
  });

  const networkFormats = formats.filter((f) => f.network === network);

  const selectedFormat = formats.find((f) => f.key === formatKey);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Formato</label>

      {/* Network selector row */}
      <div className="flex gap-2">
        {NETWORKS.map((n) => (
          <button
            key={n.id}
            onClick={() => onNetworkChange(n.id)}
            className={cn(
              "px-4 py-2 text-sm rounded-md border font-medium transition-colors",
              network === n.id
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-accent",
            )}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* Format list for selected network */}
      {network && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {networkFormats.map((fmt) => {
            const isSelected = fmt.key === formatKey;
            const aspectW = fmt.width;
            const aspectH = fmt.height;
            const previewW = 36;
            const previewH = Math.round((aspectH / aspectW) * previewW);
            const clampedH = Math.min(previewH, 64);

            return (
              <button
                key={fmt.key}
                onClick={() => onFormatChange(fmt.key, fmt.width, fmt.height)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors",
                  isSelected
                    ? "border-foreground bg-accent"
                    : "border-border hover:bg-accent",
                )}
              >
                {/* Aspect ratio preview */}
                <div className="flex-shrink-0 flex items-center justify-center w-10">
                  <div
                    className={cn(
                      "border-2 rounded-sm",
                      isSelected
                        ? "border-foreground"
                        : "border-muted-foreground",
                    )}
                    style={{
                      width: previewW,
                      height: clampedH,
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <p className="font-medium truncate">{fmt.label}</p>
                  <p className="text-muted-foreground">
                    {fmt.width}×{fmt.height}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected format summary */}
      {selectedFormat && (
        <p className="text-xs text-muted-foreground">
          Formato seleccionado:{" "}
          <span className="font-medium text-foreground">
            {selectedFormat.label}
          </span>{" "}
          — {selectedFormat.width}×{selectedFormat.height}px
        </p>
      )}
    </div>
  );
}
