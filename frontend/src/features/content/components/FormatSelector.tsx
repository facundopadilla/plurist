import { useQuery } from "@tanstack/react-query";
import { cn } from "../../../lib/utils";
import { fetchFormats } from "../../generation/api";

interface FormatSelectorProps {
  formatKey: string;
  onFormatChange: (key: string, width: number, height: number) => void;
}

export function FormatSelector({
  formatKey,
  onFormatChange,
}: FormatSelectorProps) {
  const { data: formats = [] } = useQuery({
    queryKey: ["formats"],
    queryFn: fetchFormats,
    staleTime: Infinity,
  });

  const selectedFormat = formats.find((f) => f.key === formatKey);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Format</label>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {formats.map((fmt) => {
          const isSelected = fmt.key === formatKey;
          const previewW = 36;
          const previewH = Math.min(
            Math.round((fmt.height / fmt.width) * previewW),
            64,
          );

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
              <div className="flex w-10 flex-shrink-0 items-center justify-center">
                <div
                  className={cn(
                    "rounded-sm border-2",
                    isSelected
                      ? "border-foreground"
                      : "border-muted-foreground",
                  )}
                  style={{ width: previewW, height: previewH }}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate font-medium">{fmt.label}</p>
                <p className="text-muted-foreground">
                  {fmt.width}×{fmt.height}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedFormat && (
        <p className="text-xs text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {selectedFormat.label}
          </span>{" "}
          — {selectedFormat.width}×{selectedFormat.height}px
        </p>
      )}
    </div>
  );
}
