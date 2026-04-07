/**
 * Floating Toolbar
 *
 * Rendered via portal to document.body so it stays at a fixed viewport position
 * regardless of tldraw's transform tree. Reads ElementSelection state and shows
 * controls appropriate to the element type (text, image, link).
 *
 * Design: Linear/Raycast-inspired — compact, no pills, no glassmorphism.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Trash2,
  ImagePlus,
  Link2,
  ChevronDown,
  Type,
  Sparkles,
} from "lucide-react";
import type { InlineEditController } from "./inline-edit-controller";
import type { ElementSelection } from "./inline-edit-controller";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  setFontFamily,
  setFontSize,
  toggleBold,
  toggleItalic,
  toggleUnderline,
  setTextColor,
  setBackgroundColor,
  setTextAlign,
  setLinkHref,
  replaceImageSrc,
  pickImageFile,
  deleteElement,
  isBold as queryBold,
  isItalic as queryItalic,
  isUnderlined as queryUnderlined,
  getTextAlign,
  getLinkHref,
  type TextAlignment,
} from "./toolbar-actions";

// ── Constants ────────────────────────────────────────────────────────

const TOOLBAR_GAP = 8; // px above the selected element
const TOOLBAR_VIEWPORT_PADDING = 8; // px from viewport edges

const TEXT_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Yellow", value: "#ca8a04" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#9333ea" },
  { label: "Pink", value: "#db2777" },
];

const BG_COLORS = [
  { label: "None", value: "transparent" },
  { label: "Yellow", value: "#fef9c3" },
  { label: "Green", value: "#dcfce7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Gray", value: "#f3f4f6" },
  { label: "Red", value: "#fee2e2" },
  { label: "Purple", value: "#f3e8ff" },
  { label: "White", value: "#ffffff" },
];

// ── Props ────────────────────────────────────────────────────────────

interface FloatingToolbarProps {
  selection: ElementSelection | null;
  controller: InlineEditController;
  /** Called after the toolbar performs a delete so the parent can handle cleanup */
  onDelete?: () => void;
  /** Called when the user clicks "Edit with AI" to send element context to chat */
  onEditWithAi?: () => void;
}

// ── Main Component ───────────────────────────────────────────────────

export function FloatingToolbar({
  selection,
  controller,
  onDelete,
  onEditWithAi,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  // Track which dropdown is open (only one at a time)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Link editing state
  const [editingLink, setEditingLink] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  // ── Position calculation ─────────────────────────────────────────

  useEffect(() => {
    if (!selection || !toolbarRef.current) return;

    const rect = selection.rect;
    const toolbar = toolbarRef.current;
    const toolbarRect = toolbar.getBoundingClientRect();

    let top = rect.top - toolbarRect.height - TOOLBAR_GAP;
    let left = rect.left + rect.width / 2 - toolbarRect.width / 2;

    // If toolbar goes above viewport, place below the element
    if (top < TOOLBAR_VIEWPORT_PADDING) {
      top = rect.bottom + TOOLBAR_GAP;
    }

    // Clamp horizontal position
    left = Math.max(
      TOOLBAR_VIEWPORT_PADDING,
      Math.min(
        left,
        window.innerWidth - toolbarRect.width - TOOLBAR_VIEWPORT_PADDING,
      ),
    );

    setPosition({ top, left });
  }, [selection]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return;

    function handleClick(e: MouseEvent) {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClick, { capture: true });
    return () =>
      document.removeEventListener("mousedown", handleClick, {
        capture: true,
      });
  }, [openDropdown]);

  // Reset link editing when selection changes
  useEffect(() => {
    setEditingLink(false);
    setOpenDropdown(null);
    if (selection?.type === "link") {
      setLinkValue(getLinkHref(selection.element));
    }
  }, [selection]);

  // ── Action helpers ───────────────────────────────────────────────

  const getActionElement = useCallback(() => {
    const el = controller.getActiveElement();
    if (!el || !el.isConnected) return null;
    return el;
  }, [controller]);

  const applyToActiveElement = useCallback(
    (action: (el: HTMLElement) => void) => {
      const el = getActionElement();
      if (!el) return;
      action(el);
      controller.notifySelectionUpdate();
      setOpenDropdown(null);
    },
    [controller, getActionElement],
  );

  const handleDelete = useCallback(() => {
    const el = getActionElement();
    if (el) {
      deleteElement(el);
      controller.notifySelectionUpdate();
      onDelete?.();
    }
  }, [controller, getActionElement, onDelete]);

  const handleImageReplace = useCallback(async () => {
    const el = getActionElement();
    if (!el) return;

    const dataUrl = await pickImageFile();
    if (dataUrl) {
      replaceImageSrc(el, dataUrl);
      controller.notifySelectionUpdate();
    }
  }, [controller, getActionElement]);

  const handleLinkSubmit = useCallback(() => {
    const el = getActionElement();
    if (el) {
      setLinkHref(el, linkValue);
      controller.notifySelectionUpdate();
    }
    setEditingLink(false);
  }, [controller, getActionElement, linkValue]);

  // ── Render ───────────────────────────────────────────────────────

  if (!selection) return null;

  const isText = selection.type === "text" || selection.type === "link";
  const isImage = selection.type === "image";
  const isLink = selection.type === "link";

  const selectedElement = selection.element;
  const currentBold = queryBold(selectedElement);
  const currentItalic = queryItalic(selectedElement);
  const currentUnderline = queryUnderlined(selectedElement);
  const currentAlign = getTextAlign(selectedElement);

  // Find current font family label
  const computedFont = selection.styles.fontFamily;
  const currentFontLabel =
    FONT_FAMILIES.find((f) => computedFont.includes(f.label))?.label ?? "Font";

  // Find current font size (strip decimals)
  const computedSize = selection.styles.fontSize;
  const currentSizeLabel = computedSize
    ? `${Math.round(parseFloat(computedSize))}px`
    : "16px";

  const toolbar = (
    <div
      ref={toolbarRef}
      data-floating-toolbar
      onPointerDown={(e) => {
        // Prevent toolbar interactions from stealing focus from the contentEditable
        // element inside the Shadow DOM. Without this, the browser moves focus to
        // the toolbar button, which fires focusout on the editing element and kills
        // contentEditable. This is the same pattern used by ProseMirror/Slate/Lexical.
        //
        // Exception: input elements inside the toolbar (e.g. the link URL input)
        // must be able to receive focus normally.
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Prevent toolbar clicks from triggering click-outside detection
        e.stopPropagation();
      }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 999999,
      }}
      className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-1 shadow-md dark:border-zinc-700 dark:bg-zinc-900"
    >
      {isText && (
        <>
          {/* Font family dropdown */}
          <ToolbarDropdown
            label={currentFontLabel}
            isOpen={openDropdown === "font"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "font" ? null : "font")
            }
            width={160}
          >
            {FONT_FAMILIES.map((font) => (
              <DropdownItem
                key={font.label}
                label={font.label}
                active={computedFont.includes(font.label)}
                onAction={() =>
                  applyToActiveElement((el) => setFontFamily(el, font.value))
                }
                style={{ fontFamily: font.value || "inherit" }}
              />
            ))}
          </ToolbarDropdown>

          <ToolbarDivider />

          {/* Font size dropdown */}
          <ToolbarDropdown
            label={currentSizeLabel}
            isOpen={openDropdown === "size"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "size" ? null : "size")
            }
            width={80}
          >
            {FONT_SIZES.map((size) => (
              <DropdownItem
                key={size}
                label={size}
                active={currentSizeLabel === size}
                onAction={() =>
                  applyToActiveElement((el) => setFontSize(el, size))
                }
              />
            ))}
          </ToolbarDropdown>

          <ToolbarDivider />

          {/* Bold / Italic / Underline */}
          <ToolbarButton
            active={currentBold}
            onAction={() => applyToActiveElement((el) => toggleBold(el))}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={currentItalic}
            onAction={() => applyToActiveElement((el) => toggleItalic(el))}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={currentUnderline}
            onAction={() => applyToActiveElement((el) => toggleUnderline(el))}
            title="Underline"
          >
            <Underline className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Text color */}
          <ColorPicker
            icon={<Type className="h-3.5 w-3.5" />}
            colors={TEXT_COLORS}
            currentColor={selection.styles.color}
            isOpen={openDropdown === "textColor"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "textColor" ? null : "textColor")
            }
            onSelect={(color) =>
              applyToActiveElement((el) => setTextColor(el, color))
            }
            title="Text color"
          />

          {/* Background color */}
          <ColorPicker
            icon={
              <span
                className="inline-block h-3.5 w-3.5 rounded border border-zinc-300 dark:border-zinc-600"
                style={{
                  backgroundColor:
                    selection.styles.backgroundColor === "rgba(0, 0, 0, 0)" ||
                    selection.styles.backgroundColor === "transparent"
                      ? "#f3f4f6"
                      : selection.styles.backgroundColor,
                }}
              />
            }
            colors={BG_COLORS}
            currentColor={selection.styles.backgroundColor}
            isOpen={openDropdown === "bgColor"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "bgColor" ? null : "bgColor")
            }
            onSelect={(color) =>
              applyToActiveElement((el) => setBackgroundColor(el, color))
            }
            title="Highlight"
          />

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton
            active={currentAlign === "left"}
            onAction={() =>
              applyToActiveElement((el) => setTextAlign(el, "left"))
            }
            title="Align left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={currentAlign === "center"}
            onAction={() =>
              applyToActiveElement((el) => setTextAlign(el, "center"))
            }
            title="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={currentAlign === "right"}
            onAction={() =>
              applyToActiveElement((el) => setTextAlign(el, "right"))
            }
            title="Align right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={currentAlign === "justify"}
            onAction={() =>
              applyToActiveElement((el) =>
                setTextAlign(el, "justify" as TextAlignment),
              )
            }
            title="Justify"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Link editing (only for <a> elements) */}
          {isLink && (
            <>
              <ToolbarDivider />
              {editingLink ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLinkSubmit();
                      if (e.key === "Escape") setEditingLink(false);
                    }}
                    placeholder="https://..."
                    className="h-6 w-36 rounded border border-zinc-300 bg-white px-1.5 text-xs outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:focus:border-zinc-400"
                    autoFocus
                  />
                </div>
              ) : (
                <ToolbarButton
                  onAction={() => {
                    const el = getActionElement();
                    if (!el) return;
                    setLinkValue(getLinkHref(el));
                    setEditingLink(true);
                  }}
                  title="Edit link"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </ToolbarButton>
              )}
            </>
          )}
        </>
      )}

      {isImage && (
        <>
          {/* Replace image */}
          <ToolbarButton onAction={handleImageReplace} title="Replace image">
            <ImagePlus className="h-3.5 w-3.5" />
          </ToolbarButton>
        </>
      )}

      {/* Delete — always available */}
      <ToolbarDivider />
      {onEditWithAi && (
        <ToolbarButton
          onAction={onEditWithAi}
          title="Edit with AI"
          variant="accent"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
      <ToolbarButton
        onAction={handleDelete}
        title="Delete element"
        variant="destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );

  return createPortal(toolbar, document.body);
}

// ── Sub-components ───────────────────────────────────────────────────

function ToolbarButton({
  children,
  active,
  onAction,
  title,
  variant,
}: {
  children: React.ReactNode;
  active?: boolean;
  onAction: () => void;
  title: string;
  variant?: "destructive" | "accent";
}) {
  // We use onPointerUp instead of onClick because the toolbar wrapper calls
  // e.preventDefault() on pointerdown to prevent focus theft from the
  // contentEditable element inside the Shadow DOM. In Chromium, preventDefault
  // on pointerdown suppresses the subsequent click event entirely.
  // onPointerUp fires reliably regardless of pointerdown.preventDefault().
  return (
    <button
      type="button"
      onPointerUp={(e) => {
        e.stopPropagation();
        onAction();
      }}
      title={title}
      className={[
        "flex h-7 w-7 items-center justify-center rounded transition-colors",
        variant === "destructive"
          ? "text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          : variant === "accent"
            ? "text-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300"
            : active
              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />;
}

function ToolbarDropdown({
  label,
  isOpen,
  onToggle,
  width,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onPointerUp={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex h-7 items-center gap-1 rounded px-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span className="max-w-[80px] truncate">{label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div
          className="absolute left-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-md dark:border-zinc-700 dark:bg-zinc-900"
          style={{ width }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  label,
  active,
  onAction,
  style,
}: {
  label: string;
  active: boolean;
  onAction: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onPointerUp={(e) => {
        e.stopPropagation();
        onAction();
      }}
      className={[
        "flex w-full items-center px-2.5 py-1 text-left text-xs transition-colors",
        active
          ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50",
      ].join(" ")}
      style={style}
    >
      {label}
    </button>
  );
}

function ColorPicker({
  icon,
  colors,
  currentColor,
  isOpen,
  onToggle,
  onSelect,
  title,
}: {
  icon: React.ReactNode;
  colors: { label: string; value: string }[];
  currentColor: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (color: string) => void;
  title: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onPointerUp={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={title}
        className="flex h-7 w-7 items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        {icon}
      </button>
      {isOpen && (
        <div className="absolute left-1/2 top-full z-10 mt-1 w-[132px] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            {title}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {colors.map((color) => {
              const isActive =
                currentColor === color.value ||
                (color.value === "transparent" &&
                  (currentColor === "rgba(0, 0, 0, 0)" ||
                    currentColor === "transparent"));

              return (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    onSelect(color.value);
                  }}
                  className={[
                    "h-6 w-6 rounded-md border transition-colors",
                    isActive
                      ? "border-zinc-400 ring-2 ring-zinc-400 ring-offset-1 dark:border-zinc-500 dark:ring-zinc-500"
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500",
                    color.value === "transparent"
                      ? "bg-white bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc),linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc)] bg-[length:6px_6px] bg-[position:0_0,3px_3px]"
                      : "",
                  ].join(" ")}
                  style={
                    color.value !== "transparent"
                      ? { backgroundColor: color.value }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
