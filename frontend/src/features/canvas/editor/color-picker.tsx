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
    <div className="flex w-48 flex-col gap-2 rounded-lg border border-zinc-800/70 bg-zinc-950 p-2 shadow-lg">
      {colorSources.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium text-zinc-500">
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
                    "h-6 w-6 rounded-md border-2 transition-transform hover:scale-110",
                    hexInput.toLowerCase() === hex.toLowerCase()
                      ? "border-zinc-50"
                      : "border-zinc-800",
                  )}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 flex-shrink-0 rounded-md border border-zinc-800"
          style={{ backgroundColor: hexInput }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#000000"
          className="flex-1 rounded-md border border-zinc-800/70 bg-zinc-950/80 px-1.5 py-1 font-mono text-xs text-zinc-100 outline-none focus:ring-1 focus:ring-white/[0.08]"
          maxLength={7}
        />
      </div>

      <input
        type="color"
        value={hexInput.length === 7 ? hexInput : "#000000"}
        onChange={(e) => handleSwatchClick(e.target.value)}
        className="h-7 w-full cursor-pointer rounded-md border border-zinc-800"
        title="Pick custom color"
      />
    </div>
  );
}
