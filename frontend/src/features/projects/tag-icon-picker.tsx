import { useState, useRef, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { Search, X } from "lucide-react";

// Todos los exports PascalCase de lucide-react son componentes de íconos
const ALL_ICON_NAMES = Object.keys(LucideIcons).filter(
  (k) =>
    /^[A-Z]/.test(k) &&
    k !== "LucideIcon" &&
    typeof (LucideIcons as Record<string, unknown>)[k] === "function",
);

export function DynamicIcon({
  name,
  size = 14,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = (LucideIcons as Record<string, unknown>)[name] as
    | React.ComponentType<{ size?: number; className?: string }>
    | undefined;
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}

interface TagIconPickerProps {
  value: string;
  onChange: (name: string) => void;
}

export function TagIconPicker({ value, onChange }: TagIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = search.trim()
    ? ALL_ICON_NAMES.filter((n) =>
        n.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : ALL_ICON_NAMES;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${
          value
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-input bg-background text-muted-foreground hover:bg-accent"
        }`}
        title={value ? `Ícono: ${value}` : "Seleccionar ícono"}
      >
        {value ? (
          <DynamicIcon name={value} size={14} />
        ) : (
          <span className="text-[10px] leading-none">🏷</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-72 rounded-lg border border-border bg-popover shadow-xl">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ícono..."
                className="elegant-input w-full pl-7 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-56 overflow-y-auto">
            {/* Botón quitar */}
            {value && (
              <button
                type="button"
                title="Sin ícono"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            )}

            {filtered.slice(0, 240).map((name) => (
              <button
                type="button"
                key={name}
                title={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                  setSearch("");
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  value === name
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <DynamicIcon name={name} size={14} />
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="col-span-8 py-4 text-center text-xs text-muted-foreground">
                Sin resultados para "{search}"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
