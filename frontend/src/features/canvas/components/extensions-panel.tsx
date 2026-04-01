/**
 * ExtensionsPanel — sidebar panel listing registered canvas extensions.
 *
 * Reads the tldraw editor's selection state to determine which shape is
 * selected, and passes real callbacks to extension Panel components for
 * injecting images and replacing HTML.
 */
import { useState, useCallback } from "react";
import { getExtensions, type CanvasExtension } from "../extensions";
import { useCanvasStore } from "../canvas-store";
import { HTML_SHAPE_TYPE, type HtmlShape } from "../shapes";

/**
 * Get the first selected HTML shape from the tldraw editor.
 * Returns the slideId if found, null otherwise.
 */
function useSelectedSlideId(): string | null {
  const editor = useCanvasStore((s) => s.editor);
  if (!editor) return null;

  const selectedShapes = editor.getSelectedShapes();
  const htmlShape = selectedShapes.find(
    (s): s is HtmlShape => s.type === HTML_SHAPE_TYPE,
  );

  return htmlShape?.props.slideId ?? null;
}

export function ExtensionsPanel() {
  const extensions = getExtensions();
  const [activeExtId, setActiveExtId] = useState<string | null>(null);

  const selectedSlideId = useSelectedSlideId();
  const editor = useCanvasStore((s) => s.editor);
  const updateSlideHtml = useCanvasStore((s) => s.updateSlideHtml);
  const slides = useCanvasStore((s) => s.slides);

  const selectedSlideData = selectedSlideId
    ? slides.get(selectedSlideId)
    : null;

  const handleInjectImage = useCallback(
    (imageUrl: string, selector?: string) => {
      if (!editor || !selectedSlideId) return;

      const selectedShapes = editor.getSelectedShapes();
      const htmlShape = selectedShapes.find(
        (s): s is HtmlShape => s.type === HTML_SHAPE_TYPE,
      );
      if (!htmlShape) return;

      const slide = slides.get(selectedSlideId);
      if (!slide || slide.activeVariantId == null) return;
      const variantId = slide.activeVariantId;

      const activeVariant = slide.variants.find(
        (variant) => variant.id === variantId,
      );
      if (!activeVariant) return;

      const parsed = new DOMParser().parseFromString(
        activeVariant.html,
        "text/html",
      );
      const target = parsed.querySelector(
        selector ?? "img",
      ) as HTMLImageElement | null;
      if (!target) return;

      target.src = imageUrl;
      updateSlideHtml(
        selectedSlideId,
        variantId,
        parsed.documentElement.outerHTML,
      );
    },
    [editor, selectedSlideId, slides, updateSlideHtml],
  );

  const handleReplaceHtml = useCallback(
    (html: string) => {
      if (!selectedSlideId || !selectedSlideData) return;
      const variantId = selectedSlideData.activeVariantId;
      if (variantId === null) return;
      updateSlideHtml(selectedSlideId, variantId, html);
    },
    [selectedSlideId, selectedSlideData, updateSlideHtml],
  );

  const activeExtension = activeExtId
    ? extensions.find((ext) => ext.meta.id === activeExtId)
    : null;

  if (activeExtension) {
    const { Panel } = activeExtension;
    return (
      <div className="flex flex-col h-full">
        {/* Header with back button */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button
            onClick={() => setActiveExtId(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Volver
          </button>
          <span className="text-sm font-medium text-foreground">
            {activeExtension.meta.name}
          </span>
        </div>
        {/* Extension panel content */}
        <div className="flex-1 overflow-y-auto p-3">
          <Panel
            selectedShapeId={selectedSlideId}
            onInjectImage={handleInjectImage}
            onReplaceHtml={handleReplaceHtml}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Extensiones</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Herramientas de IA para el canvas
        </p>
      </div>

      {/* Extension list */}
      <div className="flex-1 overflow-y-auto">
        {extensions.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-muted-foreground text-center px-4">
              No hay extensiones registradas.
              <br />
              Las extensiones de IA aparecerán aquí.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {extensions.map((ext) => (
              <ExtensionListItem
                key={ext.meta.id}
                extension={ext}
                onActivate={() => setActiveExtId(ext.meta.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ExtensionListItem({
  extension,
  onActivate,
}: {
  extension: CanvasExtension;
  onActivate: () => void;
}) {
  const { meta } = extension;
  return (
    <li>
      <button
        onClick={onActivate}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
      >
        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-muted text-muted-foreground">
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground block truncate">
            {meta.name}
          </span>
          <span className="text-xs text-muted-foreground block truncate">
            {meta.description}
          </span>
        </div>
      </button>
    </li>
  );
}
