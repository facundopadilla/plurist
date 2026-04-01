import { describe, expect, it } from "vitest";
import { getVariantLabel } from "../features/canvas/components/variant-label";

describe("getVariantLabel", () => {
  it("labels responsive variants clearly", () => {
    expect(
      getVariantLabel({
        id: 1,
        provider: "openai",
        modelId: "gpt-4o",
        html: "<p>Mobile</p>",
        text: "",
        variantType: "mobile",
      }),
    ).toBe("Mobile");

    expect(
      getVariantLabel({
        id: 2,
        provider: "openai",
        modelId: "gpt-4o",
        html: "<p>Tablet</p>",
        text: "",
        variantType: "tablet",
      }),
    ).toBe("Tablet");

    expect(
      getVariantLabel({
        id: 3,
        provider: "openai",
        modelId: "gpt-4o",
        html: "<p>Desktop</p>",
        text: "",
        variantType: "desktop",
      }),
    ).toBe("Desktop");
  });

  it("labels default variants with provider context", () => {
    expect(
      getVariantLabel({
        id: 4,
        provider: "anthropic",
        modelId: "claude",
        html: "<p>Default</p>",
        text: "",
      }),
    ).toBe("Default · anthropic");
  });

  it("prefers custom variant names over generated labels", () => {
    expect(
      getVariantLabel({
        id: 5,
        name: "Hero premium",
        provider: "openai",
        modelId: "gpt-4o",
        html: "<p>Named</p>",
        text: "",
      }),
    ).toBe("Hero premium");
  });
});
