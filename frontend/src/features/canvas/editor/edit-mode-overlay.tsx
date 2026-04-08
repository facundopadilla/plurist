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
}: Readonly<EditModeOverlayProps>) {
  const markDirty = useCanvasStore((s) => s.markDirty);
  const [showColorPicker, setShowColorPicker] = useState<PickerTarget>(null);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedSelector, setSelectedSelector] = useState<string>("");
  const [selectedIsImg, setSelectedIsImg] = useState(false);
  const cleanupClickRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current?.getIframe();
    if (!iframe) return;

    enableEditing(iframe, () => {
      markDirty();
    });

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

      const target = selectedSelector ?? "body";
      const property = type === "color" ? "color" : "backgroundColor";
      setElementColor(iframe, target, hex, property);
      markDirty();
    },
    [iframeRef, selectedSelector, markDirty],
  );

  const handleImageReplace = useCallback(() => {
    const iframe = iframeRef.current?.getIframe();
    if (!iframe || !imageUrl.trim()) return;

    const target = selectedSelector ?? "img";
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
      <div
        className="absolute left-0 right-0 top-0 z-10 flex items-center gap-1 border-b border-zinc-800/70 bg-zinc-950/92 px-2 py-1.5 text-zinc-100 backdrop-blur-xl"
        data-testid="edit-mode-toolbar"
      >
        <div className="relative">
          <button
            onClick={() =>
              setShowColorPicker(showColorPicker === "color" ? null : "color")
            }
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              showColorPicker === "color"
                ? "bg-zinc-50 text-zinc-900"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
            )}
            title="Text color"
          >
            <Palette size={12} />
            <span>Color</span>
          </button>
          {showColorPicker === "color" && (
            <div className="absolute left-0 top-full z-20 mt-1">
              <ColorPicker
                projectId={projectId}
                onColorSelect={(hex) => handleColorSelect(hex, "color")}
              />
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() =>
              setShowColorPicker(
                showColorPicker === "background" ? null : "background",
              )
            }
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              showColorPicker === "background"
                ? "bg-zinc-50 text-zinc-900"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
            )}
            title="Background color"
          >
            <Palette size={12} />
            <span>Fondo</span>
          </button>
          {showColorPicker === "background" && (
            <div className="absolute left-0 top-full z-20 mt-1">
              <ColorPicker
                projectId={projectId}
                onColorSelect={(hex) => handleColorSelect(hex, "background")}
              />
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowImageInput(!showImageInput)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              showImageInput
                ? "bg-zinc-50 text-zinc-900"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-100",
            )}
            title={
              selectedIsImg
                ? "Replace selected image"
                : "Replace image (click an image first)"
            }
          >
            <ImageIcon size={12} />
            <span>Image</span>
          </button>
          {showImageInput && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-800/70 bg-zinc-950 p-2 shadow-lg">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="mb-2 w-full rounded-md border border-zinc-800/70 bg-zinc-950/80 px-2 py-1 text-xs text-zinc-100 outline-none focus:ring-1 focus:ring-white/[0.08]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleImageReplace();
                  if (e.key === "Escape") setShowImageInput(false);
                }}
              />
              <button
                onClick={handleImageReplace}
                className="w-full rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-900 transition-colors hover:bg-white"
              >
                Replace
              </button>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {selectedSelector && (
          <span className="max-w-24 truncate font-mono text-[10px] text-zinc-500">
            {selectedSelector}
          </span>
        )}

        <button
          onClick={handleDone}
          className="flex items-center gap-1 rounded-md bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-900 transition-colors hover:bg-white"
          data-testid="edit-done-button"
        >
          <Check size={12} />
          <span>Listo</span>
        </button>
      </div>

      {(showColorPicker || showImageInput) && (
        <button
          type="button"
          aria-label="Close edit popovers"
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
