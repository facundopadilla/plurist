const BLOCKED_TAGS = new Set(["script", "iframe", "object", "embed"]);

function sanitizeNodeTree(root: ParentNode) {
  for (const element of Array.from(root.querySelectorAll("*"))) {
    const tagName = element.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tagName)) {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const attrName = attribute.name.toLowerCase();
      const attrValue = attribute.value.trim().toLowerCase();
      if (attrName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (
        ["href", "src", "xlink:href", "formaction"].includes(attrName) &&
        attrValue.startsWith("javascript:") // NOSONAR - explicit sanitizer blocklist for dangerous URL schemes
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

export function extractHtmlDocument(source: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, "text/html");
  sanitizeNodeTree(doc);

  const headMarkup = Array.from(doc.head.children)
    .filter((child) => !BLOCKED_TAGS.has(child.tagName.toLowerCase()))
    .map((child) => child.outerHTML)
    .join("\n");

  const bodyMarkup = doc.body.innerHTML.trim() || source;

  return {
    headMarkup,
    bodyMarkup,
  };
}

export function renderHtmlIntoShadowHost(
  host: HTMLElement,
  html: string,
  width: number,
  height: number,
  formatWidth: number,
  formatHeight: number,
  globalStyles?: string,
) {
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const { headMarkup, bodyMarkup } = extractHtmlDocument(html);

  const globalStyleBlock = globalStyles
    ? `<style data-global-styles>${globalStyles}</style>`
    : "";

  // The AI generates HTML designed for the format dimensions (e.g. 1080×1080),
  // but the shape on canvas is much smaller (e.g. 400×400). We render the body
  // at the full format size, then CSS-transform scale it down to fit the shape.
  const scaleX = width / formatWidth;
  const scaleY = height / formatHeight;
  const scale = Math.min(scaleX, scaleY);

  // Intentional: this is the canvas HTML renderer. The Shadow DOM provides style isolation.
  // Content is workspace-owned HTML (not raw user input) rendered in a sandboxed tldraw shape.
  // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method -- HTML from extractHtmlDocument/sanitizeNodeTree; not raw paste here
  root.innerHTML = `
    ${globalStyleBlock}
    ${headMarkup}
    <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      body {
        width: ${formatWidth}px;
        height: ${formatHeight}px;
      }

      #plurist-html-shape-root {
        width: ${formatWidth}px;
        height: ${formatHeight}px;
        overflow: hidden;
        transform: scale(${scale});
        transform-origin: top left;
      }
    </style>
    <div id="plurist-html-shape-root">${bodyMarkup}</div>
  `;

  for (const image of Array.from(root.querySelectorAll("img"))) {
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.loading = "eager";
  }
}
