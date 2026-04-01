import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Palette, Image as ImageIcon } from "lucide-react";
import {
  enableEditing,
  disableEditing,
  setElementColor,
  replaceImage,
  attachClickListener,
} from "./iframe-bridge";
import { ColorPicker } from "./color-picker";
import { useCanvasStore } from "../canvas-store";
import type { SlideIframeHandle } from "./types";
import { cn } from "../../../lib/utils";

interface EditModeOverlayProps {
  iframeRef: React.RefObject<SlideIframeHandle | null>;
  slideId?: string;
  projectId: number | null;
  onDone: () => void;
}

type PickerTarget = "color" | "background" | null;

export function EditModeOverlay({
  iframeRef,
  projectId,
  onDone,
}: EditModeOverlayProps) {
  const markDirty = useCanvasStore((s) => s.markDirty);
  const [showColorPicker, setShowColorPicker] = useState<PickerTarget>(null);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedSelector, setSelectedSelector] = useState<string>("");
  const [selectedIsImg, setSelectedIsImg] = useState(false);
  const cleanupClickRef = useRef<(() => void) | null>(null);

  // Enable editing when overlay mounts
  useEffect(() => {
    const iframe = iframeRef.current?.getIframe();
    if (!iframe) return;

    enableEditing(iframe, () => {
      markDirty();
    });

    // Attach click listener for element selection
    const cleanup = attachClickListener(iframe, (el, selector) => {
      setSelectedSelector(selector);
      setSelectedIsImg(el.tagName.toLowerCase() === "img");
    });
    cleanupClickRef.current = cleanup;

    return () => {
      disableEditing(iframe);
      cleanupClickRef.current?.();
    };
  }, [iframeRef, markDirty]);

  const handleColorSelect = useCallback(
    (hex: string, type: "color" | "background") => {
      const iframe = iframeRef.current?.getIframe();
      if (!iframe) return;

      const target = selectedSelector || "body";
      const property = type === "color" ? "color" : "backgroundColor";
      setElementColor(iframe, target, hex, property);
      markDirty();
    },
    [iframeRef, selectedSelector, markDirty],
  );

  const handleImageReplace = useCallback(() => {
    const iframe = iframeRef.current?.getIframe();
    if (!iframe || !imageUrl.trim()) return;

    const target = selectedSelector || "img";
    replaceImage(iframe, target, imageUrl.trim());
    setShowImageInput(false);
    setImageUrl("");
    markDirty();
  }, [iframeRef, selectedSelector, imageUrl, markDirty]);

  const handleDone = useCallback(() => {
    setShowColorPicker(null);
    setShowImageInput(false);
    onDone();
  }, [onDone]);

  return (
    <>
      {/* Toolbar — positioned above the node */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center gap-1 px-2 py-1 bg-card/95 border-b border-primary backdrop-blur-sm"
        data-testid="edit-mode-toolbar"
      >
        {/* Text color */}
        <div className="relative">
          <button
            onClick={() =>
              setShowColorPicker(showColorPicker === "color" ? null : "color")
            }
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors",
              showColorPicker === "color"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
            title="Text color"
          >
            <Palette size={12} />
            <span>Color</span>
          </button>
          {showColorPicker === "color" && (
            <div className="absolute top-full left-0 mt-1 z-20">
              <ColorPicker
                projectId={projectId}
                onColorSelect={(hex) => handleColorSelect(hex, "color")}
              />
            </div>
          )}
        </div>

        {/* Background color */}
        <div className="relative">
          <button
            onClick={() =>
              setShowColorPicker(
                showColorPicker === "background" ? null : "background",
              )
            }
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors",
              showColorPicker === "background"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
            title="Background color"
          >
            <Palette size={12} />
            <span>Fondo</span>
          </button>
          {showColorPicker === "background" && (
            <div className="absolute top-full left-0 mt-1 z-20">
              <ColorPicker
                projectId={projectId}
                onColorSelect={(hex) => handleColorSelect(hex, "background")}
              />
            </div>
          )}
        </div>

        {/* Image replace */}
        <div className="relative">
          <button
            onClick={() => setShowImageInput(!showImageInput)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors",
              showImageInput
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
            title={
              selectedIsImg
                ? "Replace selected image"
                : "Replace image (click an image first)"
            }
          >
            <ImageIcon size={12} />
            <span>Imagen</span>
          </button>
          {showImageInput && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-md shadow-md p-2 w-56">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring mb-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleImageReplace();
                  if (e.key === "Escape") setShowImageInput(false);
                }}
              />
              <button
                onClick={handleImageReplace}
                className="w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Reemplazar
              </button>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Element selector info */}
        {selectedSelector && (
          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-24">
            {selectedSelector}
          </span>
        )}

        {/* Done button */}
        <button
          onClick={handleDone}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          data-testid="edit-done-button"
        >
          <Check size={12} />
          <span>Listo</span>
        </button>
      </div>

      {/* Click-outside overlay to close pickers (not the entire node) */}
      {(showColorPicker || showImageInput) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowColorPicker(null);
            setShowImageInput(false);
          }}
        />
      )}
    </>
  );
}
