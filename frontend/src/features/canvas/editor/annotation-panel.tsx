import { useEffect, useRef } from "react";
import { MessageSquarePlus, Trash2, X } from "lucide-react";
import { useCanvasStore } from "../canvas-store";

export function AnnotationPanel() {
  const slideId = useCanvasStore((s) => s.annotationEditorSlideId);
  const panelRef = useRef<HTMLElement | null>(null);
  const slide = useCanvasStore((s) =>
    slideId ? s.slides.get(slideId) : undefined,
  );
  const addSlideAnnotation = useCanvasStore((s) => s.addSlideAnnotation);
  const updateSlideAnnotation = useCanvasStore((s) => s.updateSlideAnnotation);
  const removeSlideAnnotation = useCanvasStore((s) => s.removeSlideAnnotation);
  const closeAnnotationEditor = useCanvasStore((s) => s.closeAnnotationEditor);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const stopKeyPropagation = (event: KeyboardEvent) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    panel.addEventListener("keydown", stopKeyPropagation);
    panel.addEventListener("keyup", stopKeyPropagation);
    return () => {
      panel.removeEventListener("keydown", stopKeyPropagation);
      panel.removeEventListener("keyup", stopKeyPropagation);
    };
  }, []);

  if (!slideId || !slide) return null;

  return (
    <aside
      ref={panelRef}
      className="w-[360px] border-l border-zinc-800/60 bg-zinc-950/92 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-50">Annotations</h3>
          <p className="text-xs text-zinc-400">
            Quick notes for the current frame.
          </p>
        </div>
        <button
          type="button"
          onClick={closeAnnotationEditor}
          className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-100"
          aria-label="Close annotations"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex h-[calc(100vh-56px)] flex-col gap-3 p-4">
        <button
          type="button"
          onClick={() => addSlideAnnotation(slideId, "New annotation")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800/70 bg-zinc-950/80 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.04] hover:text-zinc-50"
        >
          <MessageSquarePlus size={16} />
          Add annotation
        </button>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {(slide.annotations ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800/70 p-4 text-sm text-zinc-500">
              This frame does not have annotations yet.
            </div>
          ) : (
            (slide.annotations ?? []).map((annotation) => (
              <div
                key={annotation.id}
                className="rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-3"
              >
                <textarea
                  value={annotation.text}
                  onChange={(event) =>
                    updateSlideAnnotation(
                      slideId,
                      annotation.id,
                      event.target.value,
                    )
                  }
                  className="min-h-[90px] w-full resize-y rounded-lg border border-zinc-800/70 bg-zinc-950/80 p-2 text-sm text-zinc-100 outline-none"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-500">
                    {new Date(annotation.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      removeSlideAnnotation(slideId, annotation.id)
                    }
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
