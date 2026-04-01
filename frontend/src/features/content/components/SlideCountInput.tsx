import { cn } from "../../../lib/utils";

interface SlideCountInputProps {
  value: number | null;
  onChange: (n: number | null) => void;
}

export function SlideCountInput({ value, onChange }: SlideCountInputProps) {
  const aiDecides = value === null;

  const handleToggle = () => {
    onChange(aiDecides ? 3 : null);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10);
    if (!isNaN(n) && n >= 1 && n <= 10) {
      onChange(n);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Cantidad de slides</label>

      <div className="flex items-center gap-4">
        <input
          type="number"
          min={1}
          max={10}
          value={aiDecides ? "" : (value ?? 1)}
          onChange={handleNumberChange}
          disabled={aiDecides}
          placeholder="1–10"
          className={cn(
            "w-20 px-3 py-2 border border-border rounded-md bg-background text-sm text-center",
            "focus:outline-none focus:ring-1 focus:ring-foreground",
            aiDecides && "opacity-40 cursor-not-allowed",
          )}
        />

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={aiDecides}
            onChange={handleToggle}
            className="h-4 w-4 rounded border-border"
          />
          <span>Que la IA decida</span>
        </label>
      </div>

      {aiDecides && (
        <p className="text-xs text-muted-foreground">
          La IA determinará la cantidad de slides (máx. 10) basándose en tu
          brief.
        </p>
      )}
    </div>
  );
}
