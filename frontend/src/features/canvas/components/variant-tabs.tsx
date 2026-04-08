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
}: Readonly<VariantTabsProps>) {
  if (variants.length <= 1) return null;

  const activeVariant =
    variants.find((variant) => variant.id === activeVariantId) ?? null;

  return (
    <div className="border-b border-zinc-800/60 bg-zinc-950/90">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5">
        {variants.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={cn(
              "flex-shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/[0.08]",
              activeVariantId === v.id
                ? "bg-zinc-50 text-zinc-900"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
            )}
          >
            {getVariantLabel(v)}
          </button>
        ))}
      </div>

      {activeVariant && (onRename || onDuplicate || onDelete) && (
        <div className="flex items-center gap-2 border-t border-zinc-800/60 px-2 py-1.5 text-[11px] text-zinc-500">
          <span className="mr-auto truncate font-medium text-zinc-100">
            {getVariantLabel(activeVariant)}
          </span>
          {onRename && (
            <button
              type="button"
              onClick={() => onRename(activeVariant.id)}
              className="rounded-md px-2 py-0.5 transition hover:bg-white/[0.04] hover:text-zinc-100"
            >
              Renombrar
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(activeVariant.id)}
              className="rounded-md px-2 py-0.5 transition hover:bg-white/[0.04] hover:text-zinc-100"
            >
              Duplicate
            </button>
          )}
          {onDelete && variants.length > 1 && (
            <button
              type="button"
              onClick={() => onDelete(activeVariant.id)}
              className="rounded-md px-2 py-0.5 text-red-300 transition hover:bg-red-500/10"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
