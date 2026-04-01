import type { SlideVariant } from "../types";

export function getVariantLabel(variant: SlideVariant) {
  if (variant.name?.trim()) {
    return variant.name.trim();
  }

  switch (variant.variantType) {
    case "mobile":
      return "Mobile";
    case "tablet":
      return "Tablet";
    case "desktop":
      return "Desktop";
    default:
      return variant.provider === "openai" ||
        variant.provider === "anthropic" ||
        variant.provider === "gemini"
        ? `Default · ${variant.provider}`
        : variant.provider;
  }
}
