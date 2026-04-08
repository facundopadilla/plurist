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
      const variantId = slide?.activeVariantId;
      if (variantId == null) return;

      const activeVariant = slide?.variants.find(
        (variant) => variant.id === variantId,
      );
      if (!activeVariant) return;

      const parsed = new DOMParser().parseFromString(
        activeVariant.html,
        "text/html",
      );
      const target = parsed.querySelector(selector ?? "img");
      if (!(target instanceof HTMLImageElement)) return;

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
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-4">
          <button
            onClick={() => setActiveExtId(null)}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-100"
          >
            &larr; Back
          </button>
          <span className="text-sm font-semibold tracking-[-0.02em] text-zinc-50">
            {activeExtension.meta.name}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-zinc-100">
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
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800/60 px-4 py-4">
        <h3 className="text-sm font-semibold tracking-[-0.02em] text-zinc-50">
          Extensions
        </h3>
        <p className="mt-1 text-xs text-zinc-400">AI tools for the canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {extensions.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="px-4 text-center text-xs text-zinc-500">
              No extensions registered.
              <br />
              AI extensions will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-900">
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
}: Readonly<{
  extension: CanvasExtension;
  onActivate: () => void;
}>) {
  const { meta } = extension;
  return (
    <li>
      <button
        onClick={onActivate}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-zinc-800/70 bg-zinc-900/80 text-zinc-400">
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-100">
            {meta.name}
          </span>
          <span className="block truncate text-xs text-zinc-500">
            {meta.description}
          </span>
        </div>
      </button>
    </li>
  );
}
