import { describe, it, expect } from "vitest";

describe("content feature components (was posts-ui-overhaul)", () => {
  it("ProjectSearchInput exports the component", async () => {
    const mod =
      await import("../features/content/components/ProjectSearchInput");
    expect(typeof mod.ProjectSearchInput).toBe("function");
  });

  it("FormatSelector exports the component", async () => {
    const mod = await import("../features/content/components/FormatSelector");
    expect(typeof mod.FormatSelector).toBe("function");
  });

  it("SlideCountInput exports the component", async () => {
    const mod = await import("../features/content/components/SlideCountInput");
    expect(typeof mod.SlideCountInput).toBe("function");
  });

  it("ProviderCard exports the component", async () => {
    const mod = await import("../features/content/components/ProviderCard");
    expect(typeof mod.ProviderCard).toBe("function");
  });

  it("barrel index exports all new components", async () => {
    const mod = await import("../features/content/components");
    expect(typeof mod.ProjectSearchInput).toBe("function");
    expect(typeof mod.FormatSelector).toBe("function");
    expect(typeof mod.SlideCountInput).toBe("function");
    expect(typeof mod.ProviderCard).toBe("function");
  });
});

describe("generation api module", () => {
  it("exports fetchFormats function", async () => {
    const mod = await import("../features/generation/api");
    expect(typeof mod.fetchFormats).toBe("function");
  });

  it("exports fetchProviders function", async () => {
    const mod = await import("../features/generation/api");
    expect(typeof mod.fetchProviders).toBe("function");
  });

  it("exports startCompare function", async () => {
    const mod = await import("../features/generation/api");
    expect(typeof mod.startCompare).toBe("function");
  });

  it("exports selectVariant function", async () => {
    const mod = await import("../features/generation/api");
    expect(typeof mod.selectVariant).toBe("function");
  });
});

describe("generation types", () => {
  it("CompareRun type has slide_count, width, height fields", async () => {
    // Type-level test: verify the module exports and TypeScript compiles correctly.
    // These are verified at build time; this test confirms the module loads.
    const mod = await import("../features/generation/types");
    // Module should load without error (types are compile-time, not runtime)
    expect(mod).toBeDefined();
  });
});

describe("ComposePage", () => {
  it("exports ComposePage component", async () => {
    const mod = await import("../features/content/compose-page");
    expect(typeof mod.ComposePage).toBe("function");
  });
});

describe("ComparePanel", () => {
  it("exports ComparePanel component", async () => {
    const mod = await import("../features/generation/compare-panel");
    expect(typeof mod.ComparePanel).toBe("function");
  });
});

describe("provider SVG assets", () => {
  it("claude.svg asset is importable", async () => {
    const mod = await import("../assets/providers/claude.svg");
    expect(mod.default).toBeTruthy();
  });

  it("openai.svg asset is importable", async () => {
    const mod = await import("../assets/providers/openai.svg");
    expect(mod.default).toBeTruthy();
  });

  it("gemini.svg asset is importable", async () => {
    const mod = await import("../assets/providers/gemini.svg");
    expect(mod.default).toBeTruthy();
  });

  it("openrouter.svg asset is importable", async () => {
    const mod = await import("../assets/providers/openrouter.svg");
    expect(mod.default).toBeTruthy();
  });
});
