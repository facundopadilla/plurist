/**
 * iframe-bridge.ts — Direct DOM manipulation via iframe.contentDocument.
 *
 * CRITICAL SECURITY: The iframe sandbox is ALWAYS "allow-same-origin".
 * NEVER add "allow-scripts". srcdoc iframes are same-origin by spec, so
 * contentDocument is directly accessible from the parent without scripts
 * inside the iframe.
 *
 * All functions wrap contentDocument access in try/catch. On failure the
 * caller receives null/empty so UI can fall back gracefully.
 */

const EDITABLE_SELECTORS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "li",
  "a",
  "div",
  "td",
  "th",
  "caption",
  "blockquote",
  "pre",
  "code",
];

interface EditingState {
  observer: MutationObserver | null;
  onChangeCallback: (() => void) | null;
}

const editingStateMap = new WeakMap<HTMLIFrameElement, EditingState>();

/**
 * Enable inline editing on all text elements inside the iframe.
 * Attaches a MutationObserver that calls onChange when content changes.
 */
export function enableEditing(
  iframe: HTMLIFrameElement,
  onChange?: () => void,
): boolean {
  try {
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return false;

    // Make text elements editable
    const selector = EDITABLE_SELECTORS.join(", ");
    const elements = doc.querySelectorAll(selector);
    elements.forEach((el) => {
      (el as HTMLElement).contentEditable = "true";
    });

    // Also enable on body itself as fallback
    doc.body.contentEditable = "true";

    // Set up MutationObserver for change detection
    const observer = new MutationObserver(() => {
      onChange?.();
    });
    observer.observe(doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    editingStateMap.set(iframe, {
      observer,
      onChangeCallback: onChange ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Disable inline editing and disconnect the MutationObserver.
 */
export function disableEditing(iframe: HTMLIFrameElement): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;

    const selector = EDITABLE_SELECTORS.join(", ");
    const elements = doc.querySelectorAll(selector);
    elements.forEach((el) => {
      (el as HTMLElement).contentEditable = "false";
    });

    doc.body.contentEditable = "false";

    const state = editingStateMap.get(iframe);
    if (state?.observer) {
      state.observer.disconnect();
    }
    editingStateMap.delete(iframe);
  } catch {
    // Ignore access errors
  }
}

/**
 * Read the current full HTML of the iframe document.
 */
export function getHtml(iframe: HTMLIFrameElement): string {
  try {
    const doc = iframe.contentDocument;
    if (!doc || !doc.documentElement) return "";
    return doc.documentElement.outerHTML;
  } catch {
    return "";
  }
}

/**
 * Apply a CSS color to the style property of an element matching the selector.
 * property: "color" | "backgroundColor" | "borderColor" etc.
 */
export function setElementColor(
  iframe: HTMLIFrameElement,
  selector: string,
  color: string,
  property: "color" | "backgroundColor" | "borderColor" = "color",
): boolean {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return false;
    const el = doc.querySelector(selector) as HTMLElement | null;
    if (!el) return false;
    el.style[property] = color;
    return true;
  } catch {
    return false;
  }
}

/**
 * Replace the src of an img element matching the selector.
 */
export function replaceImage(
  iframe: HTMLIFrameElement,
  selector: string,
  newSrc: string,
): boolean {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return false;
    const img = doc.querySelector(selector) as HTMLImageElement | null;
    if (!img) return false;
    img.src = newSrc;
    return true;
  } catch {
    return false;
  }
}

/**
 * Attach a click listener on the iframe's document (from the parent).
 * Returns the clicked element, or null if not accessible.
 * The caller receives the element via callback.
 */
export function attachClickListener(
  iframe: HTMLIFrameElement,
  onElementClick: (el: HTMLElement, selector: string) => void,
): (() => void) | null {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return null;

    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      // Build a simple selector for the element
      const tag = target.tagName.toLowerCase();
      const id = target.id ? `#${target.id}` : "";
      const cls =
        target.classList.length > 0
          ? `.${Array.from(target.classList).join(".")}`
          : "";
      const selector = `${tag}${id}${cls}`;
      onElementClick(target, selector);
    };

    doc.addEventListener("click", handler);
    return () => {
      try {
        doc.removeEventListener("click", handler);
      } catch {
        // Ignore
      }
    };
  } catch {
    return null;
  }
}
