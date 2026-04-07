import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HTMLContainer, useEditor, useIsEditing } from "tldraw";
import { useCanvasStore } from "../canvas-store";
import { VariantTabs } from "../components/variant-tabs";
import { cn } from "../../../lib/utils";
import { HtmlRenderer, type HtmlRendererHandle } from "./html-renderer";
import type { HtmlShape } from "./html-shape-types";
import {
  InlineEditController,
  type ElementSelection,
  type InlineEditCallbacks,
  type InlineEditResult,
} from "./inline-edit-controller";
import { FloatingToolbar } from "./floating-toolbar";

interface HtmlShapeComponentProps {
  shape: HtmlShape;
}

export function HtmlShapeComponent({ shape }: HtmlShapeComponentProps) {
  const { slideId, w, h, html, slideIndex, formatWidth, formatHeight } =
    shape.props;

  const editor = useEditor();
  const slideData = useCanvasStore((s) => s.slides.get(slideId));
  const globalStyles = useCanvasStore((s) => s.globalStyles);
  const enterEditMode = useCanvasStore((s) => s.enterEditMode);
  const exitEditMode = useCanvasStore((s) => s.exitEditMode);
  const updateSlideHtml = useCanvasStore((s) => s.updateSlideHtml);
  const setActiveVariant = useCanvasStore((s) => s.setActiveVariant);

  // tldraw's own editing state — true when tldraw is in editing_shape for THIS shape.
  // This fires for both double-click paths (unselected + already-selected shapes).
  const isEditing = useIsEditing(shape.id);

  // Sync tldraw's editing state → our Zustand store.
  // Other consumers (code editor, iframe shapes, context menu) read `editingNodeId`.
  useEffect(() => {
    if (isEditing) {
      enterEditMode(shape.id);
    } else {
      // Only clear if we WERE the editing node — don't clear another shape's edit.
      const current = useCanvasStore.getState().editingNodeId;
      if (current === shape.id) {
        exitEditMode();
      }
    }
  }, [isEditing, shape.id, enterEditMode, exitEditMode]);

  const activeVariant = slideData?.variants.find(
    (variant) => variant.id === slideData.activeVariantId,
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

  // ── Inline edit controller ──────────────────────────────────────────

  const rendererRef = useRef<HtmlRendererHandle>(null);
  const controllerRef = useRef<InlineEditController | null>(null);

  // Keep a stable ref to the current displayHtml so the activate call
  // can read the latest value without adding it as a dependency to the
  // useEffect (which would cause deactivate→reactivate loops).
  const displayHtmlRef = useRef(displayHtml);
  displayHtmlRef.current = displayHtml;

  // Toolbar selection state
  const [toolbarSelection, setToolbarSelection] =
    useState<ElementSelection | null>(null);

  // Lazily create a single controller instance per component mount
  if (!controllerRef.current) {
    controllerRef.current = new InlineEditController();
  }

  const commitAndExit = useCallback(
    (result: InlineEditResult) => {
      if (result.changed && slideData?.activeVariantId != null) {
        updateSlideHtml(slideId, slideData.activeVariantId, result.html);
      }
      setToolbarSelection(null);
      // Tell tldraw to exit editing state — this triggers EditingShape.onExit
      // which calls editor.setEditingShape(null), then our useEffect syncs
      // the Zustand store via exitEditMode().
      editor.setEditingShape(null);
    },
    [slideId, slideData?.activeVariantId, updateSlideHtml, editor],
  );

  const handleSelectionChange = useCallback(
    (selection: ElementSelection | null) => {
      setToolbarSelection(selection);
    },
    [],
  );

  // Compute the scale factor for outline compensation.
  // The content is rendered at formatWidth×formatHeight and scaled down to w×h.
  const editScale = Math.min(w / formatWidth, h / formatHeight);

  // Activate / deactivate controller when isEditing changes
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    if (isEditing) {
      // Small delay to let the pointer-events change propagate to the DOM
      const timeoutId = requestAnimationFrame(() => {
        const host = rendererRef.current?.getHost();
        if (host) {
          const callbacks: InlineEditCallbacks = {
            onFinish: commitAndExit,
            onSelectionChange: handleSelectionChange,
          };
          // Pass the full HTML document so the controller can reconstruct it
          // when serializing (preserving <head> styles, fonts, meta, etc.).
          // Also pass the scale factor so outlines render at correct visual size.
          controller.activate(
            host,
            callbacks,
            displayHtmlRef.current,
            editScale,
          );
        }
      });
      return () => cancelAnimationFrame(timeoutId);
    }

    // Deactivating — if controller is active, deactivate without re-triggering finish
    if (controller.isActive) {
      const result = controller.deactivate();
      if (result.changed && slideData?.activeVariantId != null) {
        updateSlideHtml(slideId, slideData.activeVariantId, result.html);
      }
    }
    setToolbarSelection(null);
  }, [
    isEditing,
    editScale,
    commitAndExit,
    handleSelectionChange,
    slideId,
    slideData?.activeVariantId,
    updateSlideHtml,
  ]);

  // ── Pointer event fence ──────────────────────────────────────────
  //
  // tldraw captures ALL pointer events at the canvas level and does
  // geometric hit-testing to detect which shape was clicked. Its
  // EditingShape state machine then eats clicks on the editing shape
  // (it expects tldraw's own rich-text editing, not our Shadow DOM).
  //
  // Solution: use tldraw's official `markEventAsHandled(e)` API.
  // Every tldraw event handler checks `wasEventAlreadyHandled(e)` at
  // the start and returns early if true. We mark events in bubble
  // phase on the shadow host — this fires BEFORE the canvas-level
  // React handlers (since host is deeper in the DOM than the canvas
  // container), so tldraw sees them as already handled.
  //
  // We intentionally do NOT call `stopPropagation()` because:
  //   1. It could prevent `click` events from firing inside the Shadow DOM
  //   2. `markEventAsHandled` is sufficient — tldraw checks it everywhere
  //   3. It keeps our fence compatible with other non-tldraw listeners
  //
  // useLayoutEffect (not useEffect) ensures listeners are attached BEFORE
  // the browser paints, closing the window where isEditing=true and
  // pointerEvents="all" but the fence isn't active yet.
  useLayoutEffect(() => {
    const host = rendererRef.current?.getHost();
    if (!host || !isEditing) return;

    const fence = (e: Event) => {
      editor.markEventAsHandled(e);
    };

    host.addEventListener("pointerdown", fence);
    host.addEventListener("pointermove", fence);
    host.addEventListener("pointerup", fence);

    return () => {
      host.removeEventListener("pointerdown", fence);
      host.removeEventListener("pointermove", fence);
      host.removeEventListener("pointerup", fence);
    };
  }, [isEditing, editor]);

  // Click-outside detection: mousedown on document outside the shadow host → finish editing
  useEffect(() => {
    if (!isEditing) return;

    function handleMouseDown(e: MouseEvent) {
      const host = rendererRef.current?.getHost();
      if (!host) return;

      // If the click is inside the shadow host, let the controller handle it
      if (host.contains(e.target as Node)) return;

      // If the click is on the variant tabs area, don't exit editing
      const shapeContainer = host.closest("[data-html-shape-id]");
      if (shapeContainer?.contains(e.target as Node)) return;

      // If the click is on the floating toolbar, don't exit editing
      const target = e.target as HTMLElement;
      if (target.closest("[data-floating-toolbar]")) return;

      // Click outside — commit and exit
      const controller = controllerRef.current;
      if (controller?.isActive) {
        const result = controller.deactivate();
        if (result.changed && slideData?.activeVariantId != null) {
          updateSlideHtml(slideId, slideData.activeVariantId, result.html);
        }
      }
      setToolbarSelection(null);
      // Exit tldraw's editing state — the useEffect sync will clear our Zustand store
      editor.setEditingShape(null);
    }

    // Use capture phase to catch events before tldraw's event system
    document.addEventListener("mousedown", handleMouseDown, { capture: true });
    return () => {
      document.removeEventListener("mousedown", handleMouseDown, {
        capture: true,
      });
    };
  }, [isEditing, slideId, slideData?.activeVariantId, updateSlideHtml, editor]);

  // Cleanup controller on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current?.isActive) {
        controllerRef.current.deactivate();
      }
    };
  }, []);

  // Handle delete from toolbar — deselect and let controller clean up
  const handleToolbarDelete = useCallback(() => {
    setToolbarSelection(null);
  }, []);

  // Handle "Edit with AI" — extract element reference and push to store
  const setElementReference = useCanvasStore((s) => s.setElementReference);

  const handleEditWithAi = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller || !slideData) return;

    const ref = controller.extractElementReference();
    if (!ref) return;

    setElementReference({
      slideId,
      variantId: slideData.activeVariantId ?? 0,
      cssPath: ref.cssPath,
      tag: ref.tag,
      label: ref.label,
      contentPreview: ref.contentPreview,
      outerHtml: ref.outerHtml,
      slideIndex: shape.props.slideIndex,
    });
  }, [slideId, slideData, setElementReference, shape.props.slideIndex]);

  return (
    <HTMLContainer
      id={shape.id}
      style={{
        width: w,
        height: h,
        overflow: "hidden",
        borderRadius: 6,
        background: "white",
        pointerEvents: "none",
      }}
    >
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-md bg-white",
          isEditing
            ? "ring-2 ring-primary ring-offset-1"
            : "border border-zinc-800/70",
        )}
        data-html-shape-id={shape.id}
      >
        {slideData && (
          <div style={{ pointerEvents: "all" }}>
            <VariantTabs
              variants={slideData.variants}
              activeVariantId={activeVariantId}
              onSelect={handleVariantSelect}
              onRename={variantActions.rename}
              onDuplicate={variantActions.duplicate}
              onDelete={variantActions.remove}
            />
          </div>
        )}

        <div className="relative flex-1 overflow-hidden bg-white">
          <HtmlRenderer
            ref={rendererRef}
            html={displayHtml}
            width={w}
            height={h}
            formatWidth={formatWidth}
            formatHeight={formatHeight}
            isEditing={isEditing}
            className="h-full w-full"
            dataExportTarget={shape.id}
            globalStyles={globalStyles}
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

      {/* Floating toolbar — rendered via portal, positioned above selected element */}
      {isEditing && controllerRef.current && (
        <FloatingToolbar
          selection={toolbarSelection}
          controller={controllerRef.current}
          onDelete={handleToolbarDelete}
          onEditWithAi={handleEditWithAi}
        />
      )}
    </HTMLContainer>
  );
}
