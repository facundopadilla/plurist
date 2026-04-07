import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Tldraw,
  react as tldrawReact,
  type Editor,
  type TLComponents,
} from "tldraw";
import "tldraw/tldraw.css";
import { useNavigate } from "react-router-dom";
import { useCanvasStore } from "./canvas-store";
import { customShapeUtils } from "./shapes";
import { HeaderBar } from "./header-bar";
import { ChatSidebar } from "./chat/chat-sidebar";
import { ResourcesPanel } from "./resources/resources-panel";
import { SkillsPanel } from "./skills/skills-panel";
import { ExtensionsPanel } from "./components/extensions-panel";
import { CodeEditorPanel } from "./code-editor/code-editor-panel";
import { VerticalNavbar } from "./components/vertical-navbar";
import { SidePanel } from "./components/side-panel";
import { ExportModal } from "./export/export-modal";
import { AnnotationPanel } from "./editor/annotation-panel";
import { ContextualAiPanel } from "./editor/contextual-ai-panel";
import { GenerateVariantsPanel } from "./editor/generate-variants-panel";
import { SocialClawContextMenu } from "./context-menu/socialclaw-context-menu";
import { exportSlideToBlob } from "./export/use-snapdom-export";
import { uploadRenderBlob } from "./export/upload-render-blob";
import { useSaveDraft } from "./hooks/use-save-draft";
import { useLoadPost } from "./hooks/use-load-post";
import { completeContent } from "../content/api";
import { toShapeId } from "./canvas-store-shapes";

// ── Register canvas extensions (once, at module load) ──────────────
import { registerAiImageStub } from "./extensions/ai-image-stub";
registerAiImageStub();

function DesktopOnlyNotice() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-50">
      <div className="max-w-sm space-y-3 px-6 text-center">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-50">
          Canvas Studio
        </h2>
        <p className="text-sm text-zinc-300">
          Canvas Compose requires a desktop browser (1024px+).
        </p>
        <p className="text-xs text-zinc-500">
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
  const setSelectedSlideIds = useCanvasStore((s) => s.setSelectedSlideIds);
  const config = useCanvasStore((s) => s.config);
  const globalStyles = useCanvasStore((s) => s.globalStyles);
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
      editor.user.updateUserPreferences({ colorScheme: "dark" });
      editor.updateInstanceState({ isGridMode: true });

      return tldrawReact("sync selected slides", () => {
        const selectedShapeIds = editor
          .getSelectedShapeIds()
          .map((shapeId) => String(shapeId));
        const currentSlides = useCanvasStore.getState().slides;
        const nextSelectedSlideIds = Array.from(currentSlides.entries())
          .filter(([slideId]) =>
            selectedShapeIds.includes(String(toShapeId(slideId))),
          )
          .sort(([, a], [, b]) => a.slideIndex - b.slideIndex)
          .map(([slideId]) => slideId);
        const currentSelectedSlideIds =
          useCanvasStore.getState().selectedSlideIds;

        if (
          currentSelectedSlideIds.length === nextSelectedSlideIds.length &&
          currentSelectedSlideIds.every(
            (slideId, index) => slideId === nextSelectedSlideIds[index],
          )
        ) {
          return;
        }

        setSelectedSlideIds(nextSelectedSlideIds);
      });
    },
    [setEditor, setSelectedSlideIds],
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
          globalStyles,
        });
        await uploadRenderBlob({
          blob,
          filename: `draft-${draftPostId}.png`,
          draftPostId,
        });
      }

      await completeContent(draftPostId);
      navigate("/content");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit for approval";
      setSubmitError(message);
    }
  }, [draftPostId, isDirty, save, navigate, slides, config, globalStyles]);

  if (isLoadingPost) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-50">
        <div className="text-sm text-zinc-400">Loading content...</div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#09090b] text-zinc-50"
      data-testid="canvas-compose-page"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fafafa 0.6px, transparent 0.6px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[18%] top-[14%] h-[360px] w-[360px] rounded-full bg-zinc-500/[0.05] blur-[140px]" />
        <div className="absolute bottom-[-120px] right-[12%] h-[300px] w-[300px] rounded-full bg-zinc-400/[0.04] blur-[140px]" />
      </div>

      {/* Header bar — 56px */}
      <HeaderBar
        onExport={() => setShowExportModal(true)}
        onSubmit={handleSubmit}
      />

      {submitError && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {submitError}
        </div>
      )}

      {/* Body: navbar + conditional panel + canvas */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Vertical tool navbar — 48px */}
        <VerticalNavbar />

        {/* Conditional side panel — 320px when open */}
        {activePanel !== null && (
          <SidePanel panelId={activePanel}>
            {activePanel === "chat" && <ChatSidebar />}
            {activePanel === "resources" && <ResourcesPanel />}
            {activePanel === "skills" && <SkillsPanel />}
            {activePanel === "extensions" && <ExtensionsPanel />}
            {activePanel === "code" && <CodeEditorPanel />}
          </SidePanel>
        )}

        {/* tldraw canvas — flex-1 */}
        <div className="relative h-full w-full flex-1 overflow-hidden">
          <Tldraw
            shapeUtils={customShapeUtils}
            components={tldrawComponents}
            onMount={handleMount}
            autoFocus
          />
        </div>

        {annotationEditorSlideId && <AnnotationPanel />}
        {contextualAiTarget &&
          (contextualAiTarget.mode === "generate-variants" ? (
            <GenerateVariantsPanel />
          ) : (
            <ContextualAiPanel />
          ))}
      </div>

      {/* Mobile blocker (lg breakpoint via CSS) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b] lg:hidden">
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
