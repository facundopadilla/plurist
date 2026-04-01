import { useCallback, useMemo, type MouseEvent } from "react";
import { HTMLContainer } from "tldraw";
import { useCanvasStore } from "../canvas-store";
import { VariantTabs } from "../components/variant-tabs";
import { cn } from "../../../lib/utils";
import { HtmlRenderer } from "./html-renderer";
import type { HtmlShape } from "./html-shape-types";

interface HtmlShapeComponentProps {
  shape: HtmlShape;
}

export function HtmlShapeComponent({ shape }: HtmlShapeComponentProps) {
  const { slideId, w, h, html, slideIndex } = shape.props;

  const slideData = useCanvasStore((s) => s.slides.get(slideId));
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const enterEditMode = useCanvasStore((s) => s.enterEditMode);
  const setActiveVariant = useCanvasStore((s) => s.setActiveVariant);

  const isEditing = editingNodeId === shape.id;

  const activeVariant = slideData?.variants.find(
    (variant) => variant.id === slideData.activeVariantId,
  );

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!isEditing) {
        enterEditMode(shape.id);
      }
    },
    [enterEditMode, isEditing, shape.id],
  );

  const handleVariantSelect = useCallback(
    (variantId: number) => {
      setActiveVariant(slideId, variantId);
    },
    [setActiveVariant, slideId],
  );

  const displayHtml = activeVariant?.html ?? html;
  const annotationCount = slideData?.annotations?.length ?? 0;
  const activeVariantId = slideData?.activeVariantId ?? null;
  const renameVariant = useCanvasStore((s) => s.renameVariant);
  const duplicateVariant = useCanvasStore((s) => s.duplicateVariant);
  const removeVariant = useCanvasStore((s) => s.removeVariant);

  const variantActions = useMemo(
    () => ({
      rename: (variantId: number) => {
        const currentVariant = slideData?.variants.find(
          (variant) => variant.id === variantId,
        );
        const nextName = window.prompt(
          "Renombrar variant",
          currentVariant?.name ?? "",
        );
        if (nextName === null) return;
        renameVariant(slideId, variantId, nextName);
      },
      duplicate: (variantId: number) => duplicateVariant(slideId, variantId),
      remove: (variantId: number) => removeVariant(slideId, variantId),
    }),
    [
      duplicateVariant,
      removeVariant,
      renameVariant,
      slideData?.variants,
      slideId,
    ],
  );

  return (
    <HTMLContainer
      id={shape.id}
      style={{
        width: w,
        height: h,
        overflow: "hidden",
        borderRadius: 6,
        background: "white",
        pointerEvents: "all",
      }}
    >
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-md bg-white",
          isEditing
            ? "ring-2 ring-primary ring-offset-1"
            : "border border-border",
        )}
        onDoubleClick={handleDoubleClick}
        data-html-shape-id={shape.id}
      >
        {slideData && (
          <VariantTabs
            variants={slideData.variants}
            activeVariantId={activeVariantId}
            onSelect={handleVariantSelect}
            onRename={variantActions.rename}
            onDuplicate={variantActions.duplicate}
            onDelete={variantActions.remove}
          />
        )}

        <div className="relative flex-1 overflow-hidden bg-white">
          <HtmlRenderer
            html={displayHtml}
            width={w}
            height={h}
            className="h-full w-full"
            dataExportTarget={shape.id}
          />
        </div>

        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white">
          Slide {slideIndex + 1}
        </span>

        {annotationCount > 0 && (
          <span className="pointer-events-none absolute right-2 top-2 rounded bg-amber-500/90 px-2 py-1 text-[10px] font-semibold text-white">
            {annotationCount} anot.
          </span>
        )}
      </div>
    </HTMLContainer>
  );
}
