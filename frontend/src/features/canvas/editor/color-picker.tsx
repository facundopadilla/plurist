import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProjectSources } from "../../design-bank/api";
import type { DesignBankSource } from "../../design-bank/types";
import { cn } from "../../../lib/utils";

interface ColorPickerProps {
  projectId: number | null;
  onColorSelect: (hex: string) => void;
  currentColor?: string;
}

function isColorSource(source: DesignBankSource): boolean {
  return (
    source.source_type === "color" &&
    typeof source.resource_data?.hex === "string"
  );
}

function getHex(source: DesignBankSource): string {
  return (source.resource_data?.hex as string) ?? "#000000";
}

export function ColorPicker({
  projectId,
  onColorSelect,
  currentColor,
}: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(currentColor ?? "#000000");

  const { data: sources = [] } = useQuery({
    queryKey: ["design-bank-sources", projectId],
    queryFn: () =>
      projectId ? fetchProjectSources(projectId) : Promise.resolve([]),
    enabled: projectId !== null,
  });

  const colorSources = sources.filter(isColorSource);

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onColorSelect(val);
    }
  }

  function handleSwatchClick(hex: string) {
    setHexInput(hex);
    onColorSelect(hex);
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-card border border-border rounded-md shadow-md w-48">
      {/* Brand color swatches */}
      {colorSources.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Brand Colors
          </p>
          <div className="flex flex-wrap gap-1">
            {colorSources.map((s) => {
              const hex = getHex(s);
              return (
                <button
                  key={s.id}
                  title={s.name}
                  onClick={() => handleSwatchClick(hex)}
                  className={cn(
                    "w-6 h-6 rounded border-2 transition-transform hover:scale-110",
                    hexInput.toLowerCase() === hex.toLowerCase()
                      ? "border-primary"
                      : "border-border",
                  )}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Hex input */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border border-border flex-shrink-0"
          style={{ backgroundColor: hexInput }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#000000"
          className="flex-1 text-xs bg-background border border-border rounded px-1.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          maxLength={7}
        />
      </div>

      {/* Native color picker */}
      <input
        type="color"
        value={hexInput.length === 7 ? hexInput : "#000000"}
        onChange={(e) => handleSwatchClick(e.target.value)}
        className="w-full h-7 rounded border border-border cursor-pointer"
        title="Pick custom color"
      />
    </div>
  );
}
