import { useEffect, useMemo, useState } from "react";
import { Code2, X } from "lucide-react";
import type { TLShapeId } from "tldraw";

import { useCanvasStore } from "../canvas-store";

function useEditingSlide() {
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const slides = useCanvasStore((s) => s.slides);
  const editor = useCanvasStore((s) => s.editor);

  return useMemo(() => {
    if (!editingNodeId || !editor) return null;
    const shape = editor.getShape(editingNodeId as TLShapeId);
    if (!shape || shape.type !== "html-shape") return null;
    const slideId = shape.props.slideId as string;
    const slide = slides.get(slideId);
    if (!slide || slide.activeVariantId === null) return null;
    const variant = slide.variants.find(
      (entry) => entry.id === slide.activeVariantId,
    );
    if (!variant) return null;
    return { slideId, variantId: variant.id, html: variant.html };
  }, [editingNodeId, editor, slides]);
}

export function HtmlCodePanel() {
  const editingSlide = useEditingSlide();
  const updateSlideHtml = useCanvasStore((s) => s.updateSlideHtml);
  const exitEditMode = useCanvasStore((s) => s.exitEditMode);
  const [draftHtml, setDraftHtml] = useState("");

  useEffect(() => {
    setDraftHtml(editingSlide?.html ?? "");
  }, [editingSlide?.html]);

  if (!editingSlide) return null;

  return (
    <aside className="w-[360px] border-l border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Editor HTML/CSS
            </h3>
            <p className="text-xs text-muted-foreground">
              Editá el markup del slide y el canvas se actualiza en vivo.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => exitEditMode()}
          className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Cerrar editor HTML"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex h-[calc(100vh-56px)] flex-col gap-3 p-4">
        <textarea
          value={draftHtml}
          onChange={(event) => {
            const nextHtml = event.target.value;
            setDraftHtml(nextHtml);
            updateSlideHtml(
              editingSlide.slideId,
              editingSlide.variantId,
              nextHtml,
            );
          }}
          spellCheck={false}
          className="min-h-[320px] flex-1 resize-none rounded-md border border-border bg-background p-3 font-mono text-xs leading-5 text-foreground outline-none ring-0"
        />

        <div className="rounded-md border border-border bg-background/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Tips</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Se bloquean scripts y handlers inline por seguridad.</li>
            <li>
              Las imágenes externas necesitan CORS para exportar con SnapDOM.
            </li>
            <li>El submit usa este HTML para generar el PNG final.</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
