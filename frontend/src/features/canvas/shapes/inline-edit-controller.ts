/**
 * Inline Edit Controller
 *
 * Manages element selection and contentEditable mode inside a Shadow DOM host.
 * When activated, text-bearing elements become editable in-place and images
 * become selectable for replacement.
 *
 * Flow:
 *   1. activate(shadowHost, callbacks) → injects hover styles, marks interactive elements
 *   2. User clicks a text element → it becomes contentEditable with focus
 *   3. User clicks an image → it becomes selected (outlined, not editable)
 *   4. Toolbar reads selection state and applies formatting commands
 *   5. deactivate() → serializes, cleans up, returns new HTML string
 */

// ── Element classification ───────────────────────────────────────────

/**
 * Build a CSS selector path from the content root to the target element.
 * Uses tag + nth-child to produce a unique, readable path.
 * Example: "div > h1:nth-child(1)" or "div > div:nth-child(2) > p:nth-child(1)"
 */
function buildCssPath(el: Element, root: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== root) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent || parent === root) {
      parts.unshift(tag);
      break;
    }

    // Find nth-of-type index among same-tag siblings
    const currentTag = current.tagName;
    const siblings = Array.from(parent.children).filter(
      (child: Element) => child.tagName === currentTag,
    );
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      parts.unshift(`${tag}:nth-of-type(${index})`);
    } else {
      parts.unshift(tag);
    }

    current = parent;
  }

  return parts.join(" > ");
}

/**
 * Truncate text to a max length, adding ellipsis if needed.
 */
function truncateText(text: string, maxLength: number): string {
  const clean = text.replaceAll(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 1) + "…";
}

type EditMarkerSnapshot = {
  editable?: string;
  type?: string;
  selected?: string;
  label?: string;
  posRel?: string;
  contentEditable: string | null;
};

function snapshotEditMarkers(el: HTMLElement): EditMarkerSnapshot {
  return {
    editable: el.dataset.scEditable,
    type: el.dataset.scType,
    selected: el.dataset.scSelected,
    label: el.dataset.scLabel,
    posRel: el.dataset.scPosRel,
    contentEditable: el.getAttribute("contenteditable"),
  };
}

function clearEditMarkers(el: HTMLElement): void {
  delete el.dataset.scEditable;
  delete el.dataset.scType;
  delete el.dataset.scSelected;
  delete el.dataset.scLabel;
  delete el.dataset.scPosRel;
  el.removeAttribute("contenteditable");
}

function restoreEditMarkers(
  el: HTMLElement,
  snapshot: EditMarkerSnapshot,
): void {
  if (snapshot.editable !== undefined)
    el.dataset.scEditable = snapshot.editable;
  if (snapshot.type !== undefined) el.dataset.scType = snapshot.type;
  if (snapshot.selected !== undefined)
    el.dataset.scSelected = snapshot.selected;
  if (snapshot.label !== undefined) el.dataset.scLabel = snapshot.label;
  if (snapshot.posRel !== undefined) el.dataset.scPosRel = snapshot.posRel;
  if (snapshot.contentEditable !== null) {
    el.setAttribute("contenteditable", snapshot.contentEditable);
  }
}

/**
 * Tags that contain meaningful user-visible text and are safe to edit inline.
 * We intentionally exclude structural elements (div, section, article, etc.)
 * to prevent the user from accidentally breaking layout.
 */
const TEXT_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "a",
  "li",
  "blockquote",
  "figcaption",
  "label",
  "button",
  "td",
  "th",
  "caption",
  "dt",
  "dd",
  "em",
  "strong",
  "b",
  "i",
  "u",
  "small",
  "mark",
  "del",
  "ins",
  "sub",
  "sup",
  "cite",
  "q",
  "abbr",
  "time",
  "legend",
]);

/** Tags that are selectable for replacement/deletion but not contentEditable. */
const IMAGE_TAGS = new Set(["img", "svg", "video", "picture"]);

/** All tags the controller considers interactive. */
const INTERACTIVE_TAGS = new Set([...TEXT_TAGS, ...IMAGE_TAGS]);

export type SelectedElementType = "text" | "image" | "link" | null;

export interface ElementSelection {
  /** The DOM element currently selected */
  element: HTMLElement;
  /** Classification of the element */
  type: SelectedElementType;
  /** Bounding rect relative to the viewport (for toolbar positioning) */
  rect: DOMRect;
  /** Computed styles of the element at selection time */
  styles: SelectionStyles;
}

export interface SelectionStyles {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: string;
  color: string;
  backgroundColor: string;
  /** For images: the current src */
  src?: string;
  /** For links: the current href */
  href?: string;
}

function classifyElement(el: Element): SelectedElementType {
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (IMAGE_TAGS.has(tag)) return "image";
  if (TEXT_TAGS.has(tag)) return "text";
  return null;
}

/** Human-readable label for the hover pill — shown on [data-sc-label] via CSS ::after */
function elementTypeLabel(type: SelectedElementType, tag: string): string {
  if (type === "link") return "Link";
  if (type === "image") {
    if (tag === "svg") return "SVG";
    if (tag === "video") return "Video";
    return "Image";
  }
  // Text — use semantic label when it adds value
  const HEADING_RE = /^h[1-6]$/;
  if (HEADING_RE.test(tag)) return "Heading";
  if (tag === "button") return "Button";
  if (tag === "label") return "Label";
  if (tag === "li") return "List item";
  if (tag === "blockquote") return "Quote";
  if (tag === "figcaption") return "Caption";
  return "Text";
}

function getSelectionStyles(el: HTMLElement): SelectionStyles {
  const computed = globalThis.getComputedStyle(el);
  return {
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontStyle: computed.fontStyle,
    textDecoration: computed.textDecoration,
    textAlign: computed.textAlign,
    color: computed.color,
    backgroundColor: computed.backgroundColor,
    src: el instanceof HTMLImageElement ? el.src : undefined,
    href: el instanceof HTMLAnchorElement ? el.href : undefined,
  };
}

/**
 * Returns true when an element is interactive (text-bearing or image).
 */
function isInteractiveElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (!INTERACTIVE_TAGS.has(tag)) return false;

  // Images are always interactive if they have a src
  if (IMAGE_TAGS.has(tag)) {
    return el instanceof HTMLImageElement ? Boolean(el.src) : true;
  }

  // Text elements must have some text content
  const text = el.textContent?.trim();
  return Boolean(text);
}

/**
 * Walk up the tree to find the best interactive target.
 * For clicks on <strong> inside <p>, we want the <p>.
 * For clicks on <span> inside <div>, we want the <span>.
 */
function findInteractiveTarget(el: Element, root: Element): Element | null {
  let current: Element | null = el;
  let bestCandidate: Element | null = null;

  while (current && current !== root) {
    if (isInteractiveElement(current)) {
      bestCandidate = current;
    }
    current = current.parentElement;
  }

  return bestCandidate;
}

// ── Inline editing style injection ───────────────────────────────────

const INLINE_EDIT_STYLE_ID = "plurist-inline-edit-styles";

function injectEditStyles(shadowRoot: ShadowRoot, scale: number) {
  // Remove existing styles first so we can update scale-compensated values
  shadowRoot.querySelector(`#${INLINE_EDIT_STYLE_ID}`)?.remove();

  const style = document.createElement("style");
  style.id = INLINE_EDIT_STYLE_ID;

  // CSS outline/border widths are affected by the parent transform: scale().
  // A 2px outline at scale 0.37 renders as ~0.74px — nearly invisible.
  // We compensate by dividing by the scale factor so visual thickness is stable.
  const s = Math.max(scale, 0.1); // guard against division by zero
  const outlineHover = `${(1.5 / s).toFixed(2)}px`;
  const outlineSelected = `${(2 / s).toFixed(2)}px`;
  const outlineOffset = `${(2 / s).toFixed(2)}px`;
  const outlineOffsetImage = `${(3 / s).toFixed(2)}px`;
  const labelFontSize = `${(11 / s).toFixed(2)}px`;
  const labelPadX = `${(5 / s).toFixed(2)}px`;
  const labelPadY = `${(2 / s).toFixed(2)}px`;
  const labelRadius = `${(3 / s).toFixed(2)}px`;
  const labelOffset = `${(-18 / s).toFixed(2)}px`;

  style.textContent = `
    [data-sc-editable] {
      cursor: pointer;
      transition: outline 0.12s ease;
      outline: ${outlineHover} dashed transparent;
      outline-offset: ${outlineOffset};
      border-radius: 2px;
    }

    /* Only set position:relative on elements that don't already have positioning.
       This avoids breaking absolute/fixed/sticky elements in AI-generated HTML.
       The data-sc-pos-rel attribute is set by JavaScript during activate(). */
    [data-sc-editable][data-sc-pos-rel] {
      position: relative;
    }

    /* ── Hover highlight (Canva/Stitch-style) ──
       Visible blue dashed outline on hover, no background tint.
       This gives the user a clear signal of what is clickable. */
    [data-sc-editable]:hover {
      outline-color: rgba(59, 130, 246, 0.6);
    }

    /* ── Hover label showing element type ──
       Small pill label above the element on hover: "Text", "Image", "Link" */
    [data-sc-editable]:hover::after {
      content: attr(data-sc-label);
      position: absolute;
      top: ${labelOffset};
      left: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: ${labelFontSize};
      font-weight: 500;
      line-height: 1;
      color: #fff;
      background: rgba(59, 130, 246, 0.9);
      padding: ${labelPadY} ${labelPadX};
      border-radius: ${labelRadius};
      white-space: nowrap;
      pointer-events: none;
      z-index: 10000;
    }
    /* Hide label when element is being edited (contenteditable) to avoid visual clutter */
    [data-sc-editable][contenteditable="true"]::after {
      display: none;
    }

    /* ── Selected state (clicked, before contenteditable) ── */
    [data-sc-editable][data-sc-selected="true"] {
      outline: ${outlineSelected} solid rgba(59, 130, 246, 0.8);
      background: rgba(59, 130, 246, 0.04);
    }

    /* ── Contenteditable active ── */
    [data-sc-editable][contenteditable="true"] {
      outline: ${outlineSelected} solid rgba(59, 130, 246, 0.8);
      background: rgba(59, 130, 246, 0.04);
      cursor: text;
    }
    [data-sc-editable][contenteditable="true"]:focus {
      outline: ${outlineSelected} solid rgba(59, 130, 246, 1);
      background: rgba(59, 130, 246, 0.06);
    }

    /* ── Image-specific styles ── */
    [data-sc-editable][data-sc-type="image"] {
      cursor: pointer;
    }
    [data-sc-editable][data-sc-type="image"][data-sc-selected="true"] {
      outline: ${outlineSelected} solid rgba(59, 130, 246, 1);
      outline-offset: ${outlineOffsetImage};
    }
  `;
  shadowRoot.prepend(style);
}

function removeEditStyles(shadowRoot: ShadowRoot) {
  shadowRoot.querySelector(`#${INLINE_EDIT_STYLE_ID}`)?.remove();
}

function hasInteractiveTextChild(el: Element): boolean {
  return Array.from(el.children).some(
    (child) =>
      isInteractiveElement(child) && TEXT_TAGS.has(child.tagName.toLowerCase()),
  );
}

// ── Document reconstruction ──────────────────────────────────────────

/**
 * Reconstruct a full HTML document by replacing only the body content.
 *
 * The AI generates complete HTML documents with <head> (styles, meta, fonts)
 * and <body>. The inline editor only modifies elements inside the body.
 * When serializing, we must preserve the <head> to avoid losing all CSS.
 *
 * Strategy: parse the original document, replace body.innerHTML, serialize back.
 * DOMParser + XMLSerializer is used to avoid regex fragility.
 */
function reconstructDocument(
  originalFullHtml: string,
  newBodyInnerHtml: string,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(originalFullHtml, "text/html");

  // Inline edit serializes back workspace-owned HTML already constrained to the editable body subtree.
  doc.body.innerHTML = newBodyInnerHtml; // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method -- body content comes from the in-app editor

  // Serialize back to a full HTML string.
  // doc.documentElement.outerHTML gives us <html>...</html>
  // We prepend the doctype if the original had one.
  const hasDoctype = originalFullHtml
    .trimStart()
    .toLowerCase()
    .startsWith("<!doctype");
  const doctype = hasDoctype ? "<!DOCTYPE html>\n" : "";
  return doctype + doc.documentElement.outerHTML;
}

// ── Controller ───────────────────────────────────────────────────────

export interface InlineEditResult {
  /** The new full HTML string after editing */
  html: string;
  /** Whether the HTML actually changed */
  changed: boolean;
}

export interface InlineEditCallbacks {
  /** Called when the user finishes editing (Escape or click outside) */
  onFinish: (result: InlineEditResult) => void;
  /** Called whenever the selected element changes (or clears) */
  onSelectionChange: (selection: ElementSelection | null) => void;
}

export class InlineEditController {
  private shadowRoot: ShadowRoot | null = null;
  private contentRoot: Element | null = null;
  private originalBodyHtml = "";
  /**
   * The full HTML document string (including <head> styles) passed in at activation.
   * Used to reconstruct the complete document when serializing edits — otherwise
   * only the body innerHTML would be saved, losing all <style> tags.
   */
  private fullDocumentHtml = "";
  private activeElement: HTMLElement | null = null;
  private activeElementType: SelectedElementType = null;
  private interactiveElements: HTMLElement[] = [];

  // Bound event handlers (for removal)
  // Typed as EventListener because ShadowRoot's addEventListener only accepts
  // EventListener | EventListenerObject for non-"slotchange" event types.
  private handleClick: EventListener | null = null;
  private handleKeyDown: EventListener | null = null;
  private handleFocusOut: EventListener | null = null;

  // Callbacks
  private callbacks: InlineEditCallbacks | null = null;

  /**
   * Enter inline editing mode.
   *
   * @param host – The shadow DOM host element
   * @param callbacks – Callbacks for finish and selection change
   * @param fullHtml – The full HTML document string (with <head>/<style> tags)
   * @param scale – CSS transform scale applied to the content root (e.g. 400/1080).
   *               Used to compensate outline widths so they look correct at any zoom.
   */
  activate(
    host: HTMLElement,
    callbacks: InlineEditCallbacks,
    fullHtml: string,
    scale = 1,
  ): boolean {
    const shadowRoot = host.shadowRoot;
    if (!shadowRoot) return false;

    const contentRoot = shadowRoot.querySelector("#plurist-html-shape-root");
    if (!contentRoot) return false;

    this.shadowRoot = shadowRoot;
    this.contentRoot = contentRoot;
    this.callbacks = callbacks;

    // Snapshot original body HTML for change detection
    this.originalBodyHtml = contentRoot.innerHTML;
    // Keep the full document for reconstruction at serialize time
    this.fullDocumentHtml = fullHtml;

    // Inject editing styles (scale-compensated outlines + hover labels)
    injectEditStyles(shadowRoot, scale);

    this.interactiveElements = this.collectInteractiveElements(contentRoot);

    // Attach event listeners on the shadow root
    this.bindRootListeners(shadowRoot);

    return this.interactiveElements.length > 0;
  }

  /**
   * Exit inline editing, serialize, and clean up.
   */
  deactivate(): InlineEditResult {
    const result = this.serialize();
    this.cleanup();
    return result;
  }

  /**
   * Whether the controller is currently active.
   */
  get isActive(): boolean {
    return this.shadowRoot !== null;
  }

  /**
   * The currently active element (for toolbar actions).
   */
  getActiveElement(): HTMLElement | null {
    return this.activeElement;
  }

  /**
   * The type of the currently active element.
   */
  getActiveElementType(): SelectedElementType {
    return this.activeElementType;
  }

  /**
   * Re-emit the current selection (e.g. after a style change).
   */
  notifySelectionUpdate(): void {
    if (!this.activeElement) return;

    if (!this.activeElement.isConnected) {
      this.activeElement = null;
      this.activeElementType = null;
      this.callbacks?.onSelectionChange(null);
      return;
    }

    this.emitSelection(this.activeElement);
  }

  /**
   * Extract a reference descriptor for the currently selected element.
   * Returns null if no element is selected.
   *
   * This is used by the "Edit with AI" button to create an ElementReference
   * that gets attached to the chat context, so the AI knows exactly
   * which DOM element the user wants to modify.
   */
  extractElementReference(): {
    cssPath: string;
    tag: string;
    label: string;
    contentPreview: string;
    outerHtml: string;
  } | null {
    if (!this.activeElement || !this.contentRoot) return null;

    const el = this.activeElement;
    const tag = el.tagName.toLowerCase();
    const type = classifyElement(el);
    const label = elementTypeLabel(type, tag);
    const cssPath = buildCssPath(el, this.contentRoot);

    // Content preview: text for text elements, src for images
    let contentPreview: string;
    if (type === "image") {
      const src =
        el instanceof HTMLImageElement
          ? el.src
          : (el.getAttribute("src") ?? "");
      contentPreview = truncateText(src, 80);
    } else {
      contentPreview = truncateText(el.textContent ?? "", 60);
    }

    // Clean outerHTML: temporarily remove our data attributes to get a clean snapshot
    const savedMarkers = snapshotEditMarkers(el);
    clearEditMarkers(el);
    const outerHtml = truncateText(el.outerHTML, 500);
    restoreEditMarkers(el, savedMarkers);

    return { cssPath, tag, label, contentPreview, outerHtml };
  }

  // ── Private: event handlers ──────────────────────────────────────

  private collectInteractiveElements(contentRoot: Element): HTMLElement[] {
    const interactiveElements: HTMLElement[] = [];

    for (const el of Array.from(contentRoot.querySelectorAll("*"))) {
      if (!isInteractiveElement(el) || !(el instanceof HTMLElement)) continue;

      const tag = el.tagName.toLowerCase();
      if (TEXT_TAGS.has(tag) && hasInteractiveTextChild(el)) continue;

      const type = classifyElement(el);
      el.dataset.scEditable = "true";
      if (type) {
        el.dataset.scType = type;
      }
      el.dataset.scLabel = elementTypeLabel(type, tag);

      const position = globalThis.getComputedStyle(el).position;
      if (position === "static" || position === "") {
        el.dataset.scPosRel = "";
      }

      interactiveElements.push(el);
    }

    return interactiveElements;
  }

  private bindRootListeners(shadowRoot: ShadowRoot): void {
    this.handleClick = ((e: Event) =>
      this.onClick(e as MouseEvent)) as EventListener;
    this.handleKeyDown = ((e: Event) =>
      this.onKeyDown(e as KeyboardEvent)) as EventListener;
    this.handleFocusOut = ((e: Event) =>
      this.onFocusOut(e as FocusEvent)) as EventListener;

    shadowRoot.addEventListener("click", this.handleClick);
    shadowRoot.addEventListener("keydown", this.handleKeyDown);
    shadowRoot.addEventListener("focusout", this.handleFocusOut);
  }

  private onClick(e: MouseEvent) {
    const target = e.target as Element | null;
    if (!target || !this.contentRoot) return;

    const interactive = findInteractiveTarget(target, this.contentRoot);

    if (interactive && interactive instanceof HTMLElement) {
      e.stopPropagation();
      e.preventDefault();
      this.selectElement(interactive);
    } else {
      // Clicked on a non-interactive area — deselect current
      this.deselectCurrent();
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      this.commitAndFinish();
    }

    // Delete/Backspace on a selected non-text element → remove it
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      this.activeElement &&
      this.activeElementType === "image"
    ) {
      e.stopPropagation();
      e.preventDefault();
      this.deleteActiveElement();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onFocusOut(_e: FocusEvent) {
    if (!this.activeElement) return;

    // Use a microtask to check if focus truly left the editing context.
    // This handles cases where:
    //   - Focus moves to the floating toolbar (portal on document.body)
    //   - Focus moves to another element inside the shadow DOM
    //   - Browser doesn't set relatedTarget (e.g. clicking non-focusable elements)
    //
    // The toolbar prevents focus theft via pointerdown preventDefault, so
    // focusout should rarely fire during toolbar interactions. But if it does,
    // this debounce ensures we only stop editing when focus genuinely left.
    requestAnimationFrame(() => {
      if (!this.activeElement || !this.shadowRoot) return;

      // Check if focus is still inside the shadow DOM
      const hostEl = this.shadowRoot.host;
      if (document.activeElement === hostEl) return;
      if (hostEl.contains(document.activeElement)) return;

      // Check if focus is on the floating toolbar
      if (document.activeElement instanceof HTMLElement) {
        if (document.activeElement.closest("[data-floating-toolbar]")) return;
      }

      // Focus genuinely left — stop text editing (but keep element selected)
      this.stopTextEditing();
    });
  }

  // ── Private: selection lifecycle ────────────────────────────────

  private selectElement(el: HTMLElement) {
    // Deselect previous
    if (this.activeElement && this.activeElement !== el) {
      this.deselectCurrent();
    }

    if (this.activeElement === el) return;

    const type = classifyElement(el);
    this.activeElement = el;
    this.activeElementType = type;
    el.dataset.scSelected = "true";

    if (type === "text" || type === "link") {
      // Make text editable
      el.contentEditable = "true";
      el.focus();

      // Select all text for easy replacement
      // ShadowRoot.getSelection() is not in TS's DOM typings but is supported
      // in Chromium-based browsers (our primary target for this canvas app).
      const selection = (
        this.shadowRoot as unknown as { getSelection?: () => Selection | null }
      )?.getSelection?.();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(el);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    // Emit selection to toolbar
    this.emitSelection(el);
  }

  private deselectCurrent() {
    if (!this.activeElement) return;
    this.stopTextEditing();
    delete this.activeElement.dataset.scSelected;
    this.activeElement = null;
    this.activeElementType = null;
    this.callbacks?.onSelectionChange(null);
  }

  private stopTextEditing() {
    if (!this.activeElement) return;
    if (this.activeElement.contentEditable === "true") {
      this.activeElement.contentEditable = "false";
    }
  }

  private emitSelection(el: HTMLElement) {
    const type = classifyElement(el);
    const rect = el.getBoundingClientRect();
    const styles = getSelectionStyles(el);
    this.callbacks?.onSelectionChange({ element: el, type, rect, styles });
  }

  /**
   * Delete the currently selected element from the DOM.
   */
  deleteActiveElement(): void {
    if (!this.activeElement) return;
    const el = this.activeElement;
    this.deselectCurrent();
    el.remove();
  }

  private commitAndFinish() {
    this.stopTextEditing();
    const result = this.deactivate();
    this.callbacks?.onFinish(result);
  }

  // ── Private: serialization ───────────────────────────────────────

  private serialize(): InlineEditResult {
    if (!this.contentRoot) {
      return { html: this.fullDocumentHtml, changed: false };
    }

    // Remove our editing attributes before serializing
    for (const el of this.interactiveElements) {
      clearEditMarkers(el);
    }

    const newBodyHtml = this.contentRoot.innerHTML;
    const changed = newBodyHtml !== this.originalBodyHtml;

    if (!changed) {
      return { html: this.fullDocumentHtml, changed: false };
    }

    // Reconstruct the full HTML document with the edited body.
    // Parse the original document, replace the body content, and serialize back.
    // This preserves all <head> content (styles, meta, links, etc.).
    const html = reconstructDocument(this.fullDocumentHtml, newBodyHtml);
    return { html, changed: true };
  }

  // ── Private: cleanup ─────────────────────────────────────────────

  private cleanup() {
    if (this.shadowRoot) {
      if (this.handleClick) {
        this.shadowRoot.removeEventListener("click", this.handleClick);
      }
      if (this.handleKeyDown) {
        this.shadowRoot.removeEventListener("keydown", this.handleKeyDown);
      }
      if (this.handleFocusOut) {
        this.shadowRoot.removeEventListener("focusout", this.handleFocusOut);
      }

      removeEditStyles(this.shadowRoot);

      // Clean up any remaining editing markers
      for (const el of this.interactiveElements) {
        clearEditMarkers(el);
      }
    }

    this.shadowRoot = null;
    this.contentRoot = null;
    this.originalBodyHtml = "";
    this.fullDocumentHtml = "";
    this.activeElement = null;
    this.activeElementType = null;
    this.interactiveElements = [];
    this.handleClick = null;
    this.handleKeyDown = null;
    this.handleFocusOut = null;
    this.callbacks = null;
  }
}
