export interface ElementPatchResult {
  applied: boolean;
  html: string;
  error?: string;
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

    target.outerHTML = updatedOuterHtml;

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
