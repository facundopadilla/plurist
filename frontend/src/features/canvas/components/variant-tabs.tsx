import { cn } from "../../../lib/utils";
import type { SlideVariant } from "../types";
import { getVariantLabel } from "./variant-label";

interface VariantTabsProps {
  variants: SlideVariant[];
  activeVariantId: number | null;
  onSelect: (variantId: number) => void;
  onRename?: (variantId: number) => void;
  onDuplicate?: (variantId: number) => void;
  onDelete?: (variantId: number) => void;
}

export function VariantTabs({
  variants,
  activeVariantId,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: VariantTabsProps) {
  if (variants.length <= 1) return null;

  const activeVariant =
    variants.find((variant) => variant.id === activeVariantId) ?? null;

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1">
        {variants.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={cn(
              "flex-shrink-0 px-2 py-0.5 text-[11px] font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              activeVariantId === v.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {getVariantLabel(v)}
          </button>
        ))}
      </div>

      {activeVariant && (onRename || onDuplicate || onDelete) && (
        <div className="flex items-center gap-2 border-t border-border/80 px-2 py-1.5 text-[11px] text-muted-foreground">
          <span className="mr-auto truncate font-medium text-foreground">
            {getVariantLabel(activeVariant)}
          </span>
          {onRename && (
            <button
              type="button"
              onClick={() => onRename(activeVariant.id)}
              className="rounded px-2 py-0.5 transition hover:bg-accent hover:text-foreground"
            >
              Renombrar
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(activeVariant.id)}
              className="rounded px-2 py-0.5 transition hover:bg-accent hover:text-foreground"
            >
              Duplicar
            </button>
          )}
          {onDelete && variants.length > 1 && (
            <button
              type="button"
              onClick={() => onDelete(activeVariant.id)}
              className="rounded px-2 py-0.5 text-destructive transition hover:bg-destructive/10"
            >
              Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
