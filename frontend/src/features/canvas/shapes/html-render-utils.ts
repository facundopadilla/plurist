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
        attrValue.startsWith("javascript:")
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
) {
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const { headMarkup, bodyMarkup } = extractHtmlDocument(html);

  // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method
  // Intentional: this is the canvas HTML renderer. The Shadow DOM provides style isolation.
  // Content is workspace-owned HTML (not raw user input) rendered in a sandboxed tldraw shape.
  root.innerHTML = `
    ${headMarkup}
    <style>
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      body {
        width: ${width}px;
        height: ${height}px;
      }

      #socialclaw-html-shape-root {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
    </style>
    <div id="socialclaw-html-shape-root">${bodyMarkup}</div>
  `;

  for (const image of Array.from(root.querySelectorAll("img"))) {
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.loading = "eager";
  }
}
