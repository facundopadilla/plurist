export interface ElementPatchResult {
  applied: boolean;
  html: string;
  error?: string;
}

const DANGEROUS_URL_SCHEMES = new Set(["javascript"]);

function hasDangerousScheme(value: string) {
  const scheme = value.split(":", 1)[0];
  return DANGEROUS_URL_SCHEMES.has(scheme);
}

function sanitizeMarkup(markup: string) {
  const parser = new DOMParser();
  const fragment = parser.parseFromString(markup, "text/html");
  for (const element of Array.from(fragment.body.querySelectorAll("*"))) {
    const tagName = element.tagName.toLowerCase();
    if (["script", "iframe", "object", "embed"].includes(tagName)) {
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
        hasDangerousScheme(attrValue)
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  return fragment.body.innerHTML;
}

export function applyElementPatch(
  slideHtml: string,
  cssPath: string,
  updatedOuterHtml: string,
): ElementPatchResult {
  try {
    const parser = new DOMParser();
    const document = parser.parseFromString(slideHtml, "text/html");
    const target = document.body.querySelector(cssPath);

    if (!target) {
      return {
        applied: false,
        html: slideHtml,
        error: `Target element not found for selector: ${cssPath}`,
      };
    }

    const sanitizedOuterHtml = sanitizeMarkup(updatedOuterHtml);
    target.outerHTML = sanitizedOuterHtml; // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method -- sanitized immediately above

    const hasDoctype = /<!doctype/i.test(slideHtml);
    const hasHtmlTag = /<html[\s>]/i.test(slideHtml);

    if (hasHtmlTag) {
      const serialized = document.documentElement.outerHTML;
      return {
        applied: true,
        html: hasDoctype ? `<!DOCTYPE html>\n${serialized}` : serialized,
      };
    }

    return { applied: true, html: document.body.innerHTML };
  } catch (error) {
    return {
      applied: false,
      html: slideHtml,
      error:
        error instanceof Error
          ? error.message
          : "Failed to apply element patch safely.",
    };
  }
}
