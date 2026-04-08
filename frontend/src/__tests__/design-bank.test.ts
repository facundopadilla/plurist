import { describe, it, expect } from "vitest";

describe("design-bank", () => {
  it("DesignBankPage module exports the page component", async () => {
    const mod = await import("../features/design-bank/design-bank-page");
    expect(typeof mod.DesignBankPage).toBe("function");
  }, 15_000);

  it("AddResourceModal module exports the component", async () => {
    const mod = await import("../features/design-bank/add-resource-modal");
    expect(typeof mod.AddResourceModal).toBe("function");
  });

  it("FolderCard module exports the component", async () => {
    const mod = await import("../features/design-bank/folder-card");
    expect(typeof mod.FolderCard).toBe("function");
  });

  it("api module exports expected functions", async () => {
    const mod = await import("../features/design-bank/api");
    expect(typeof mod.fetchSources).toBe("function");
    expect(typeof mod.fetchSource).toBe("function");
    expect(typeof mod.uploadFile).toBe("function");
    expect(typeof mod.ingestUrl).toBe("function");
  });
});
