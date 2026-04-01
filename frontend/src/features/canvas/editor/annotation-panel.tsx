import { MessageSquarePlus, Trash2, X } from "lucide-react";
import { useCanvasStore } from "../canvas-store";

export function AnnotationPanel() {
  const slideId = useCanvasStore((s) => s.annotationEditorSlideId);
  const slide = useCanvasStore((s) =>
    slideId ? s.slides.get(slideId) : undefined,
  );
  const addSlideAnnotation = useCanvasStore((s) => s.addSlideAnnotation);
  const updateSlideAnnotation = useCanvasStore((s) => s.updateSlideAnnotation);
  const removeSlideAnnotation = useCanvasStore((s) => s.removeSlideAnnotation);
  const closeAnnotationEditor = useCanvasStore((s) => s.closeAnnotationEditor);

  if (!slideId || !slide) return null;

  return (
    <aside className="w-[360px] border-l border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Anotaciones</h3>
          <p className="text-xs text-muted-foreground">
            Comentarios rápidos para el frame actual.
          </p>
        </div>
        <button
          type="button"
          onClick={closeAnnotationEditor}
          className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Cerrar anotaciones"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex h-[calc(100vh-56px)] flex-col gap-3 p-4">
        <button
          type="button"
          onClick={() => addSlideAnnotation(slideId, "Nueva anotación")}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
        >
          <MessageSquarePlus size={16} />
          Agregar anotación
        </button>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {(slide.annotations ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Este frame todavía no tiene anotaciones.
            </div>
          ) : (
            (slide.annotations ?? []).map((annotation) => (
              <div
                key={annotation.id}
                className="rounded-md border border-border bg-background p-3"
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
                  className="min-h-[90px] w-full resize-y rounded border border-border bg-background p-2 text-sm text-foreground outline-none"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(annotation.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      removeSlideAnnotation(slideId, annotation.id)
                    }
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                    Borrar
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
