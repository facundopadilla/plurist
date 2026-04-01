import { describe, it, expect } from "vitest";

describe("projects api", () => {
  it("exports all expected functions", async () => {
    const mod = await import("../features/projects/api");
    expect(typeof mod.fetchProjects).toBe("function");
    expect(typeof mod.fetchProject).toBe("function");
    expect(typeof mod.createProject).toBe("function");
    expect(typeof mod.updateProject).toBe("function");
    expect(typeof mod.uploadProjectIcon).toBe("function");
    expect(typeof mod.getProjectIconUrl).toBe("function");
    expect(typeof mod.deleteProject).toBe("function");
  });

  it("getProjectIconUrl returns correct path", async () => {
    const { getProjectIconUrl } = await import("../features/projects/api");
    expect(getProjectIconUrl(1)).toBe("/api/v1/projects/1/icon");
    expect(getProjectIconUrl(42)).toBe("/api/v1/projects/42/icon");
    expect(getProjectIconUrl(999)).toBe("/api/v1/projects/999/icon");
  });
});

describe("projects types", () => {
  it("ProjectTag and Project types can be used", async () => {
    const mod = await import("../features/projects/types");
    // Types are compile-time only; importing the module should not throw
    expect(mod).toBeDefined();
  });
});

describe("projects components", () => {
  it("ProjectCard module exports the component", async () => {
    const mod = await import("../features/projects/project-card");
    expect(typeof mod.ProjectCard).toBe("function");
  });

  it("ProjectEditModal module exports the component", async () => {
    const mod = await import("../features/projects/project-edit-modal");
    expect(typeof mod.ProjectEditModal).toBe("function");
  });

  it("DeleteConfirmModal module exports the component", async () => {
    const mod = await import("../features/projects/delete-confirm-modal");
    expect(typeof mod.DeleteConfirmModal).toBe("function");
  });
});
