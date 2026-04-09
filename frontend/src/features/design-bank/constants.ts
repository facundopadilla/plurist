/** Polling interval while sources are pending/processing (ms). */
export const DESIGN_BANK_POLL_MS = 3000 as const;

/** localStorage key for global design bank folders/list view */
export const DESIGN_BANK_GLOBAL_VIEW_KEY = "db-global-view" as const;

/** localStorage key for project design bank grid/list preference */
export const DESIGN_BANK_PROJECT_VIEW_MODE_KEY = "db-view-mode" as const;

const IMAGE_TYPES_LIST = [
  "image",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "webp",
  "logo",
] as const;

/** Lowercase source_type values treated as images in UI/preview */
export const IMAGE_SOURCE_TYPE_SET: ReadonlySet<string> = new Set(
  IMAGE_TYPES_LIST,
);

/** Code types that may load from storage or snippets (includes design_system). */
export const CODE_LIKE_SOURCE_TYPE_SET: ReadonlySet<string> = new Set([
  "html",
  "design_system",
  "css",
  "js",
  "javascript",
  "markdown",
]);

/** Code types for the main design bank "code" filter */
export const CODE_FILTER_SOURCE_TYPE_SET: ReadonlySet<string> = new Set([
  "html",
  "css",
  "js",
  "javascript",
  "markdown",
  "design_system",
]);

/** Code-like types for syntax/highlight UI (excludes design_system) */
export const CODE_SYNTAX_SOURCE_TYPE_SET: ReadonlySet<string> = new Set([
  "html",
  "css",
  "js",
  "javascript",
  "markdown",
]);

/** highlight.js language id by source_type */
export const SOURCE_TYPE_HIGHLIGHT_LANG: Readonly<Record<string, string>> = {
  html: "xml",
  design_system: "markdown",
  css: "css",
  js: "javascript",
  javascript: "javascript",
  markdown: "markdown",
};

export function isImageSourceType(sourceType: string): boolean {
  return IMAGE_SOURCE_TYPE_SET.has(sourceType.toLowerCase());
}

export function isCodeLikeSourceType(sourceType: string): boolean {
  return CODE_LIKE_SOURCE_TYPE_SET.has(sourceType.toLowerCase());
}

export function isCodeSyntaxSourceType(sourceType: string): boolean {
  return CODE_SYNTAX_SOURCE_TYPE_SET.has(sourceType.toLowerCase());
}

export function getHighlightLanguageForSourceType(
  sourceType: string,
): string | undefined {
  return SOURCE_TYPE_HIGHLIGHT_LANG[sourceType.toLowerCase()];
}
