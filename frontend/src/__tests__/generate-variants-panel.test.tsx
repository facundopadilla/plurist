import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GenerateVariantsPanel } from "../features/canvas/editor/generate-variants-panel";
import { useCanvasStore } from "../features/canvas/canvas-store";
import {
  cleanupDom,
  press,
  renderWithQuery,
  typeIn,
  waitFor,
} from "./test-dom";

const { fetchProjects, fetchProjectSources, uploadFile } = vi.hoisted(() => ({
  fetchProjects: vi.fn(),
  fetchProjectSources: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock("../features/projects/api", () => ({
  fetchProjects,
}));

vi.mock("../features/design-bank/api", () => ({
  fetchProjectSources,
  getSourceFileUrl: (id: number) => `/api/v1/design-bank/sources/${id}/file`,
  uploadFile,
}));

function makeMockEditor() {
  const shapes = new Map<string, Record<string, unknown>>();

  return {
    createShape: vi.fn((partial: Record<string, unknown>) => {
      shapes.set(partial.id as string, partial);
    }),
    deleteShape: vi.fn(),
    deleteShapes: vi.fn(),
    updateShape: vi.fn((partial: Record<string, unknown>) => {
      const existing = shapes.get(partial.id as string);
      if (existing)
        shapes.set(partial.id as string, { ...existing, ...partial });
    }),
    select: vi.fn(),
    getSelectedShapes: vi.fn(() => []),
    getShape: vi.fn((id: string) => shapes.get(id) ?? null),
  };
}

describe("GenerateVariantsPanel", () => {
  beforeEach(() => {
    useCanvasStore.setState(useCanvasStore.getInitialState());
    window.sessionStorage.clear();
    fetchProjects.mockResolvedValue([
      {
        id: 7,
        name: "SocialClaw",
        description: "",
        tags: [],
        color: "#6366f1",
        icon_url: "",
        created_at: "",
        updated_at: "",
      },
    ]);
    fetchProjectSources.mockResolvedValue([]);
    uploadFile.mockReset();
  });

  afterEach(() => {
    cleanupDom();
  });

  it("clears the visual editor selection when the panel opens", async () => {
    const editor = makeMockEditor();
    useCanvasStore.getState().setEditor(editor as never);
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Base</p>", "openai", 1);
    useCanvasStore.getState().openContextualAi(slideId, "generate-variants");

    renderWithQuery(<GenerateVariantsPanel />);

    await waitFor(() => {
      expect(editor.select).toHaveBeenCalledWith();
    });
  });

  it("renders the prompt composer controls", async () => {
    const editor = makeMockEditor();
    useCanvasStore.getState().setEditor(editor as never);
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Base</p>", "openai", 1);
    useCanvasStore.getState().setConfig({ projectId: 7 });
    useCanvasStore.getState().openContextualAi(slideId, "generate-variants");

    renderWithQuery(<GenerateVariantsPanel />);

    await waitFor(() => {
      expect(document.body.textContent).toContain("Generate Variants");
      expect(
        document.querySelector('button[aria-label="Add prompt context"]'),
      ).not.toBeNull();
      expect(
        document.querySelector('button[aria-label="Speech to text"]'),
      ).not.toBeNull();
      expect(document.body.textContent).toContain("SocialClaw");
    });
  });

  it("preserves per-slide draft state when switching between slides", async () => {
    const editor = makeMockEditor();
    useCanvasStore.getState().setEditor(editor as never);
    useCanvasStore.getState().setConfig({ projectId: 7 });
    const firstSlideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>First</p>", "openai", 1);
    const secondSlideId = useCanvasStore
      .getState()
      .addSlide(1, "<p>Second</p>", "openai", 1);
    useCanvasStore
      .getState()
      .openContextualAi(firstSlideId, "generate-variants");

    const view = renderWithQuery(<GenerateVariantsPanel />);

    await waitFor(() => {
      const textarea = view.container.querySelector("textarea");
      expect(textarea).not.toBeNull();
    });

    typeIn(
      view.container.querySelector("textarea") as HTMLTextAreaElement,
      "Use the attached brand texture",
    );

    useCanvasStore
      .getState()
      .openContextualAi(secondSlideId, "generate-variants");

    await waitFor(() => {
      expect(
        (view.container.querySelector("textarea") as HTMLTextAreaElement).value,
      ).toBe("");
    });

    useCanvasStore
      .getState()
      .openContextualAi(firstSlideId, "generate-variants");

    await waitFor(() => {
      expect(
        (view.container.querySelector("textarea") as HTMLTextAreaElement).value,
      ).toBe("Use the attached brand texture");
    });

    const storedDrafts = JSON.parse(
      window.sessionStorage.getItem("socialclaw:generate-variants-drafts") ??
        "{}",
    );
    expect(storedDrafts[firstSlideId].instruction).toBe(
      "Use the attached brand texture",
    );
  });

  it("prunes stale drafts when saving a fresh one", async () => {
    window.sessionStorage.setItem(
      "socialclaw:generate-variants-drafts",
      JSON.stringify({
        stale: {
          instruction: "old",
          creativeRange: "explore",
          selectedAspects: [],
          attachments: [],
          updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        },
      }),
    );

    const editor = makeMockEditor();
    useCanvasStore.getState().setEditor(editor as never);
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Base</p>", "openai", 1);
    useCanvasStore.getState().openContextualAi(slideId, "generate-variants");

    const view = renderWithQuery(<GenerateVariantsPanel />);

    await waitFor(() => {
      expect(view.container.querySelector("textarea")).not.toBeNull();
    });

    typeIn(
      view.container.querySelector("textarea") as HTMLTextAreaElement,
      "fresh",
    );

    await waitFor(() => {
      const storedDrafts = JSON.parse(
        window.sessionStorage.getItem("socialclaw:generate-variants-drafts") ??
          "{}",
      );
      expect(storedDrafts.stale).toBeUndefined();
      expect(storedDrafts[slideId].instruction).toBe("fresh");
    });
  });

  it("shows image previews in the Design Bank picker", async () => {
    fetchProjectSources.mockResolvedValue([
      {
        id: 21,
        name: "Moodboard",
        original_filename: "moodboard.png",
        source_type: "image",
        storage_key: "design-bank/moodboard.png",
        url: "",
        status: "ready",
        extracted_data: {},
        resource_data: {},
        error_message: "",
        project_id: 7,
        file_size_bytes: 1200,
        created_at: "",
        updated_at: "",
      },
    ]);

    const editor = makeMockEditor();
    useCanvasStore.getState().setEditor(editor as never);
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<p>Base</p>", "openai", 1);
    useCanvasStore.getState().setConfig({ projectId: 7 });
    useCanvasStore.getState().openContextualAi(slideId, "generate-variants");

    renderWithQuery(<GenerateVariantsPanel />);

    await waitFor(() => {
      expect(
        document.querySelector('button[aria-label="Add prompt context"]'),
      ).not.toBeNull();
    });

    press(
      document.querySelector(
        'button[aria-label="Add prompt context"]',
      ) as Element,
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain("Import from Design Bank");
    });

    press(
      Array.from(document.querySelectorAll('[role="menuitem"]')).find((node) =>
        node.textContent?.includes("Import from Design Bank"),
      ) as Element,
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain("Moodboard");
      const preview = document.querySelector(
        'img[src="/api/v1/design-bank/sources/21/file"]',
      );
      expect(preview).not.toBeNull();
    });
  });
});
