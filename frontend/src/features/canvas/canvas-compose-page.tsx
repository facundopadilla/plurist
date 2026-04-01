import { useState, useCallback, useEffect, useMemo } from "react";
import { Tldraw, type Editor, type TLComponents } from "tldraw";
import "tldraw/tldraw.css";
import { useNavigate } from "react-router-dom";
import { useCanvasStore } from "./canvas-store";
import { customShapeUtils } from "./shapes";
import { HeaderBar } from "./header-bar";
import { ChatSidebar } from "./chat/chat-sidebar";
import { ResourcesPanel } from "./resources/resources-panel";
import { ExtensionsPanel } from "./components/extensions-panel";
import { VerticalNavbar } from "./components/vertical-navbar";
import { SidePanel } from "./components/side-panel";
import { ExportModal } from "./export/export-modal";
import { HtmlCodePanel } from "./editor/html-code-panel";
import { AnnotationPanel } from "./editor/annotation-panel";
import { ContextualAiPanel } from "./editor/contextual-ai-panel";
import { SocialClawContextMenu } from "./context-menu/socialclaw-context-menu";
import { exportSlideToBlob } from "./export/use-snapdom-export";
import { uploadRenderBlob } from "./export/upload-render-blob";
import { useSaveDraft } from "./hooks/use-save-draft";
import { useLoadPost } from "./hooks/use-load-post";
import { submitContentForApproval } from "../content/api";

// ── Register canvas extensions (once, at module load) ──────────────
import { registerAiImageStub } from "./extensions/ai-image-stub";
registerAiImageStub();

function DesktopOnlyNotice() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-center space-y-3 px-6">
        <h2 className="text-lg font-semibold text-foreground">Canvas Studio</h2>
        <p className="text-sm text-muted-foreground">
          Canvas Compose requires a desktop browser (1024px+).
        </p>
        <p className="text-xs text-muted-foreground">
          Please open this page on a larger screen.
        </p>
      </div>
    </div>
  );
}

function CanvasContent() {
  const draftPostId = useCanvasStore((s) => s.draftPostId);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const activePanel = useCanvasStore((s) => s.activePanel);
  const resetActivePanel = useCanvasStore((s) => s.resetActivePanel);
  const setEditor = useCanvasStore((s) => s.setEditor);
  const slides = useCanvasStore((s) => s.slides);
  const config = useCanvasStore((s) => s.config);
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const annotationEditorSlideId = useCanvasStore(
    (s) => s.annotationEditorSlideId,
  );
  const contextualAiTarget = useCanvasStore((s) => s.contextualAiTarget);

  const [showExportModal, setShowExportModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const tldrawComponents = useMemo<TLComponents>(
    () => ({ ContextMenu: SocialClawContextMenu }),
    [],
  );

  // Wire up auto-save + beforeunload guard
  const { save } = useSaveDraft();

  // Load existing post if ?postId= is in URL
  const { isLoading: isLoadingPost } = useLoadPost();

  useEffect(() => {
    resetActivePanel();
  }, [resetActivePanel]);

  const handleMount = useCallback(
    (editor: Editor) => {
      setEditor(editor);
    },
    [setEditor],
  );

  const handleSubmit = useCallback(async () => {
    if (!draftPostId) return;

    // Force-save pending changes before submission
    if (isDirty) {
      await save();
    }

    try {
      setSubmitError(null);

      const orderedSlides = Array.from(slides.entries()).sort(
        ([, a], [, b]) => a.slideIndex - b.slideIndex,
      );
      const primarySlide = orderedSlides[0]?.[1];
      const primaryVariant = primarySlide?.variants.find(
        (variant) => variant.id === primarySlide.activeVariantId,
      );

      if (primaryVariant) {
        const blob = await exportSlideToBlob({
          html: primaryVariant.html,
          width: config.formatWidth,
          height: config.formatHeight,
          format: "png",
        });
        await uploadRenderBlob({
          blob,
          filename: `draft-${draftPostId}.png`,
          draftPostId,
        });
      }

      await submitContentForApproval(draftPostId);
      navigate("/contenido");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al enviar para aprobación";
      setSubmitError(message);
    }
  }, [draftPostId, isDirty, save, navigate, slides, config]);

  if (isLoadingPost) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">
          Cargando contenido...
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen flex flex-col bg-background"
      data-testid="canvas-compose-page"
    >
      {/* Header bar — 56px */}
      <HeaderBar
        onExport={() => setShowExportModal(true)}
        onSubmit={handleSubmit}
      />

      {submitError && (
        <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-b border-destructive/20">
          {submitError}
        </div>
      )}

      {/* Body: navbar + conditional panel + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical tool navbar — 48px */}
        <VerticalNavbar />

        {/* Conditional side panel — 320px when open */}
        {activePanel !== null && (
          <SidePanel>
            {activePanel === "chat" && <ChatSidebar />}
            {activePanel === "resources" && <ResourcesPanel />}
            {activePanel === "extensions" && <ExtensionsPanel />}
          </SidePanel>
        )}

        {/* tldraw canvas — flex-1 */}
        <div className="flex-1 relative w-full h-full">
          <Tldraw
            shapeUtils={customShapeUtils}
            components={tldrawComponents}
            onMount={handleMount}
            autoFocus
          />
        </div>

        {editingNodeId && <HtmlCodePanel />}
        {annotationEditorSlideId && <AnnotationPanel />}
        {contextualAiTarget && <ContextualAiPanel />}
      </div>

      {/* Mobile blocker (lg breakpoint via CSS) */}
      <div className="lg:hidden fixed inset-0 z-50 bg-background flex items-center justify-center">
        <DesktopOnlyNotice />
      </div>

      {/* Export modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}

export function CanvasComposePage() {
  return <CanvasContent />;
}
