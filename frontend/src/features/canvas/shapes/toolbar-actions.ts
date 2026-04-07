/**
 * Toolbar Actions — Pure DOM manipulation functions for the floating toolbar.
 *
 * Each function takes a target HTMLElement and applies a visual change.
 * They operate directly on inline styles of the Shadow DOM elements.
 *
 * Why inline styles instead of CSS classes?
 *   Because the HTML is AI-generated with arbitrary class names we can't predict.
 *   Inline styles override everything and are preserved during serialization.
 */

// ── Font Family ──────────────────────────────────────────────────────

/** Common web-safe + Google Fonts families for the font picker. */
export const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Lato", value: "'Lato', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Oswald", value: "'Oswald', sans-serif" },
] as const;

export function setFontFamily(el: HTMLElement, fontFamily: string): void {
  if (!fontFamily) {
    el.style.removeProperty("font-family");
  } else {
    el.style.setProperty("font-family", fontFamily, "important");
  }
}

// ── Font Size ────────────────────────────────────────────────────────

/** Pre-defined font sizes for the size picker. */
export const FONT_SIZES = [
  "10px",
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "28px",
  "32px",
  "36px",
  "40px",
  "48px",
  "56px",
  "64px",
  "72px",
  "80px",
  "96px",
] as const;

export function setFontSize(el: HTMLElement, size: string): void {
  el.style.setProperty("font-size", size, "important");
}

// ── Font Weight (Bold) ───────────────────────────────────────────────

export function toggleBold(el: HTMLElement): boolean {
  const computed = window.getComputedStyle(el);
  const currentWeight = parseInt(computed.fontWeight, 10);
  const isBold = currentWeight >= 600;
  el.style.setProperty("font-weight", isBold ? "400" : "700", "important");
  return !isBold;
}

export function isBold(el: HTMLElement): boolean {
  const computed = window.getComputedStyle(el);
  return parseInt(computed.fontWeight, 10) >= 600;
}

// ── Font Style (Italic) ─────────────────────────────────────────────

export function toggleItalic(el: HTMLElement): boolean {
  const computed = window.getComputedStyle(el);
  const isItalic = computed.fontStyle === "italic";
  el.style.setProperty(
    "font-style",
    isItalic ? "normal" : "italic",
    "important",
  );
  return !isItalic;
}

export function isItalic(el: HTMLElement): boolean {
  return window.getComputedStyle(el).fontStyle === "italic";
}

// ── Text Decoration (Underline) ──────────────────────────────────────

export function toggleUnderline(el: HTMLElement): boolean {
  const computed = window.getComputedStyle(el);
  const hasUnderline = computed.textDecorationLine.includes("underline");
  el.style.setProperty(
    "text-decoration-line",
    hasUnderline ? "none" : "underline",
    "important",
  );
  return !hasUnderline;
}

export function isUnderlined(el: HTMLElement): boolean {
  return window.getComputedStyle(el).textDecorationLine.includes("underline");
}

// ── Text Color ───────────────────────────────────────────────────────

export function setTextColor(el: HTMLElement, color: string): void {
  el.style.setProperty("color", color, "important");
}

// ── Background Color / Highlight ─────────────────────────────────────

export function setBackgroundColor(el: HTMLElement, color: string): void {
  if (!color || color === "transparent") {
    el.style.removeProperty("background-color");
  } else {
    el.style.setProperty("background-color", color, "important");
  }
}

// ── Text Alignment ───────────────────────────────────────────────────

export type TextAlignment = "left" | "center" | "right" | "justify";

export function setTextAlign(el: HTMLElement, align: TextAlignment): void {
  el.style.setProperty("text-align", align, "important");
}

export function getTextAlign(el: HTMLElement): TextAlignment {
  const computed = window.getComputedStyle(el);
  const align = computed.textAlign;
  if (align === "center" || align === "right" || align === "justify") {
    return align;
  }
  return "left";
}

// ── Link Editing ─────────────────────────────────────────────────────

export function setLinkHref(el: HTMLElement, href: string): void {
  if (el instanceof HTMLAnchorElement) {
    el.href = href;
  }
}

export function getLinkHref(el: HTMLElement): string {
  if (el instanceof HTMLAnchorElement) {
    return el.href;
  }
  return "";
}

// ── Image Replacement ────────────────────────────────────────────────

/**
 * Replace an image's src. Accepts a data URL, blob URL, or regular URL.
 */
export function replaceImageSrc(el: HTMLElement, newSrc: string): void {
  if (el instanceof HTMLImageElement) {
    el.src = newSrc;
    el.removeAttribute("srcset"); // Clear srcset to avoid conflicts
  }
}

/**
 * Open a file picker dialog and return the selected file as a data URL.
 * Returns null if the user cancels.
 */
export function pickImageFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    // Handle cancel
    input.addEventListener("cancel", () => resolve(null));

    document.body.appendChild(input);
    input.click();
    // Clean up the input after a delay (file dialog is modal)
    setTimeout(() => input.remove(), 60000);
  });
}

// ── Element Deletion ─────────────────────────────────────────────────

/**
 * Remove an element from the DOM.
 * Returns true if the element was removed, false if not found.
 */
export function deleteElement(el: HTMLElement): boolean {
  if (el.parentElement) {
    el.remove();
    return true;
  }
  return false;
}
