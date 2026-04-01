/**
 * IframeShapeComponent — React component rendered inside IframeShapeUtil.
 *
 * This component bridges the tldraw shape system with the iframe-bridge
 * editing subsystem. It manages:
 *  - Iframe rendering with srcdoc
 *  - Double-click → edit mode entry
 *  - Edit mode overlay (toolbar + iframe-bridge integration)
 *  - Variant tabs for multi-provider content
 *  - HTML capture on edit-done
 */
import { useRef, useCallback } from "react";
import { HTMLContainer } from "tldraw";
import { useCanvasStore } from "../canvas-store";
import { EditModeOverlay } from "../editor/edit-mode-overlay";
import { VariantTabs } from "../components/variant-tabs";
import type { SlideIframeHandle } from "../editor/types";
import type { IframeShape } from "./iframe-shape-types";
import { cn } from "../../../lib/utils";

interface IframeShapeComponentProps {
  shape: IframeShape;
}

export function IframeShapeComponent({ shape }: IframeShapeComponentProps) {
  const { slideId, w, h, html, slideIndex } = shape.props;

  const slideData = useCanvasStore((s) => s.slides.get(slideId));
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const enterEditMode = useCanvasStore((s) => s.enterEditMode);
  const exitEditMode = useCanvasStore((s) => s.exitEditMode);
  const setActiveVariant = useCanvasStore((s) => s.setActiveVariant);
  const updateSlideHtml = useCanvasStore((s) => s.updateSlideHtml);
  const config = useCanvasStore((s) => s.config);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isEditing = editingNodeId === shape.id;

  const activeVariant = slideData?.variants.find(
    (v) => v.id === slideData.activeVariantId,
  );

  // Expose the iframe element through the SlideIframeHandle interface
  // so EditModeOverlay can access it via its iframeRef prop
  const iframeHandle: React.RefObject<SlideIframeHandle | null> =
    useRef<SlideIframeHandle>({
      getIframe: () => iframeRef.current,
    });

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isEditing) {
        enterEditMode(shape.id);
      }
    },
    [shape.id, isEditing, enterEditMode],
  );

  const handleDone = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe && slideData && slideData.activeVariantId !== null) {
      try {
        const newHtml = iframe.contentDocument?.documentElement.outerHTML ?? "";
        if (newHtml) {
          updateSlideHtml(slideId, slideData.activeVariantId, newHtml);
        }
      } catch {
        // contentDocument access failed — silently ignore
      }
    }
    exitEditMode();
  }, [slideId, slideData, updateSlideHtml, exitEditMode]);

  const handleVariantSelect = useCallback(
    (variantId: number) => {
      setActiveVariant(slideId, variantId);
    },
    [slideId, setActiveVariant],
  );

  // Use active variant HTML if available, fall back to shape prop
  const displayHtml = activeVariant?.html ?? html;

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
          "relative w-full h-full flex flex-col",
          isEditing
            ? "ring-2 ring-primary ring-offset-1 rounded-md"
            : "border border-border rounded-md",
        )}
        onDoubleClick={handleDoubleClick}
      >
        {/* Variant tabs (only when multiple variants exist) */}
        {slideData && (
          <VariantTabs
            variants={slideData.variants}
            activeVariantId={slideData.activeVariantId}
            onSelect={handleVariantSelect}
          />
        )}

        {/* Iframe content */}
        <div className="flex-1 relative overflow-hidden">
          <iframe
            ref={iframeRef}
            srcDoc={displayHtml}
            sandbox="allow-same-origin"
            title={`Slide ${slideIndex + 1}`}
            className="absolute inset-0 w-full h-full border-none"
            style={{ pointerEvents: isEditing ? "auto" : "none" }}
          />
        </div>

        {/* Edit mode overlay (toolbar) */}
        {isEditing && (
          <EditModeOverlay
            iframeRef={iframeHandle}
            slideId={slideId}
            projectId={config.projectId}
            onDone={handleDone}
          />
        )}
      </div>
    </HTMLContainer>
  );
}
