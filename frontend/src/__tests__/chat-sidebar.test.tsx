import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatSidebar } from "../features/canvas/chat/chat-sidebar";
import { useCanvasStore } from "../features/canvas/canvas-store";
import { cleanupDom, renderWithQuery, typeIn, waitFor } from "./test-dom";

const {
  fetchProjects,
  fetchProjectDesignSystemStatus,
  fetchProjectSources,
  syncProjectDesignSystem,
  uploadFile,
  sendMessage,
  onElementPatch,
} = vi.hoisted(() => ({
  fetchProjects: vi.fn(),
  fetchProjectDesignSystemStatus: vi.fn(),
  fetchProjectSources: vi.fn(),
  syncProjectDesignSystem: vi.fn(),
  uploadFile: vi.fn(),
  sendMessage: vi.fn(),
  onElementPatch: vi.fn(() => ({ applied: true })),
}));

vi.mock("../features/projects/api", () => ({
  fetchProjects,
}));

vi.mock("../features/design-bank/api", () => ({
  fetchProjectDesignSystemStatus,
  fetchProjectSources,
  getSourceFileUrl: (id: number) => `/api/v1/design-bank/sources/${id}/file`,
  syncProjectDesignSystem,
  uploadFile,
}));

vi.mock("../features/canvas/chat/use-chat-stream", () => ({
  useChatStream: () => ({
    sendMessage,
    cancel: vi.fn(),
  }),
}));

vi.mock("../features/canvas/hooks/use-chat-to-canvas", () => ({
  useChatToCanvas: () => ({
    onHtmlBlock: vi.fn(),
    onElementPatch,
  }),
}));

vi.mock("../features/canvas/header-dropdowns", () => ({
  NetworkDropdown: () => <div>Network dropdown</div>,
  FormatDropdown: () => <div>Format dropdown</div>,
  ModelDropdown: ({ iconOnly }: { iconOnly?: boolean }) =>
    iconOnly ? (
      <button aria-label="Select models">Model button</button>
    ) : (
      <div>Model dropdown</div>
    ),
}));

describe("ChatSidebar", () => {
  beforeEach(() => {
    useCanvasStore.setState(useCanvasStore.getInitialState());
    globalThis.localStorage.clear();
    fetchProjects.mockResolvedValue([
      {
        id: 7,
        name: "Plurist",
        description: "",
        tags: [],
        color: "#6366f1",
        icon_url: "",
        created_at: "",
        updated_at: "",
      },
    ]);
    fetchProjectDesignSystemStatus.mockResolvedValue({
      has_design_system: true,
      has_reference_brief: true,
      has_relevant_sources: false,
      is_outdated: false,
      relevant_source_count: 0,
      last_relevant_source_at: null,
      artifact_revision: null,
      design_system_source_id: 10,
      reference_brief_source_id: 11,
      has_manual_edits: false,
    });
    fetchProjectSources.mockResolvedValue([]);
    syncProjectDesignSystem.mockReset();
    syncProjectDesignSystem.mockResolvedValue({
      ok: true,
      status: {
        has_design_system: true,
        has_reference_brief: true,
        has_relevant_sources: true,
        is_outdated: false,
        relevant_source_count: 2,
        last_relevant_source_at: "2026-04-07T23:00:00Z",
        artifact_revision: "2026-04-07T23:00:00Z",
        design_system_source_id: 10,
        reference_brief_source_id: 11,
        has_manual_edits: false,
      },
      design_system_source_id: 10,
      reference_brief_source_id: 11,
    });
    uploadFile.mockReset();
    sendMessage.mockReset();
    onElementPatch.mockReset();
    onElementPatch.mockReturnValue({ applied: true });
    useCanvasStore.getState().setConfig({ projectId: 7 });
  });

  afterEach(() => {
    cleanupDom();
  });

  it("renders the main chat composer actions", async () => {
    renderWithQuery(<ChatSidebar />);

    await waitFor(() => {
      expect(document.body.textContent).toContain("Plan");
      expect(document.body.textContent).toContain("Build");
      expect(document.body.textContent).toContain("Plurist");
      expect(
        document
          .querySelector('textarea[aria-label="Message for AI assistant"]')
          ?.getAttribute("placeholder"),
      ).toContain("prompt");
      expect(
        document.querySelector('button[aria-label="Select models"]'),
      ).not.toBeNull();
      expect(
        document.querySelector('button[aria-label="Add prompt context"]'),
      ).not.toBeNull();
      expect(
        document.querySelector('button[aria-label="Speech to text"]'),
      ).not.toBeNull();
      expect(
        document.querySelector(
          'textarea[aria-label="Message for AI assistant"]',
        ),
      ).not.toBeNull();
      expect(
        document.querySelector('[data-testid="chat-composer"]'),
      ).not.toBeNull();
    });
  });

  it("shows first-run design system onboarding and starts the wizard flow", async () => {
    fetchProjectDesignSystemStatus.mockResolvedValue({
      has_design_system: false,
      has_reference_brief: false,
      has_relevant_sources: false,
      is_outdated: false,
      relevant_source_count: 0,
      last_relevant_source_at: null,
      artifact_revision: null,
      design_system_source_id: null,
      reference_brief_source_id: null,
      has_manual_edits: false,
    });

    renderWithQuery(<ChatSidebar />);

    await waitFor(() => {
      expect(document.body.textContent).toContain("No design system yet");
      expect(document.body.textContent).toContain("Yes, let's start");
    });

    const startButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Yes, let's start"),
    ) as HTMLButtonElement | undefined;

    startButton?.click();

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        "Create project design system",
      );
    });

    const wizardTextarea = Array.from(
      document.querySelectorAll("textarea"),
    ).find(
      (textarea) =>
        textarea.getAttribute("aria-label") !== "Message for AI assistant",
    ) as HTMLTextAreaElement | undefined;
    expect(wizardTextarea).toBeDefined();
    typeIn(wizardTextarea!, "Use a premium editorial tone.");

    const createButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Create design system"),
    ) as HTMLButtonElement | undefined;
    createButton?.click();

    await waitFor(() => {
      expect(syncProjectDesignSystem).toHaveBeenCalledWith(7, {
        provider: "openai",
        model_id: null,
        guidance: "Use a premium editorial tone.",
      });
      expect(document.body.textContent).toContain(
        "Created a project design system and reference brief.",
      );
    });
  });

  it("shows a refresh prompt when project design-system artifacts are outdated", async () => {
    fetchProjectDesignSystemStatus.mockResolvedValue({
      has_design_system: true,
      has_reference_brief: true,
      has_relevant_sources: true,
      is_outdated: true,
      relevant_source_count: 3,
      last_relevant_source_at: "2026-04-07T23:30:00Z",
      artifact_revision: "2026-04-07T22:00:00Z",
      design_system_source_id: 10,
      reference_brief_source_id: 11,
      has_manual_edits: false,
    });

    renderWithQuery(<ChatSidebar />);

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        "New Design Bank context detected",
      );
      expect(document.body.textContent).toContain("Update now");
    });
  });

  it("asks for confirmation before refreshing artifacts with manual edits", async () => {
    fetchProjectDesignSystemStatus.mockResolvedValue({
      has_design_system: true,
      has_reference_brief: true,
      has_relevant_sources: true,
      is_outdated: true,
      relevant_source_count: 3,
      last_relevant_source_at: "2026-04-07T23:30:00Z",
      artifact_revision: "2026-04-07T22:00:00Z",
      design_system_source_id: 10,
      reference_brief_source_id: 11,
      has_manual_edits: true,
    });

    renderWithQuery(<ChatSidebar />);

    await waitFor(() => {
      expect(document.body.textContent).toContain("Update now");
    });

    const updateButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Update now"),
    ) as HTMLButtonElement | undefined;
    updateButton?.click();

    await waitFor(() => {
      expect(document.body.textContent).toContain("Replace manual edits?");
    });

    expect(syncProjectDesignSystem).not.toHaveBeenCalled();
  });

  it("keeps technical element context out of the visible user message", async () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<section><h2>Hola!</h2></section>", "openai", 1);

    useCanvasStore.getState().setElementReference({
      slideId,
      variantId: 1,
      slideIndex: 0,
      cssPath: "section > h2",
      tag: "h2",
      label: "Heading",
      contentPreview: "Hola!",
      outerHtml: "<h2>Hola!</h2>",
    });

    renderWithQuery(<ChatSidebar />);

    await waitFor(() => {
      expect(document.body.textContent).toContain("Editing Heading");
    });

    const textarea = document.querySelector(
      'textarea[aria-label="Message for AI assistant"]',
    ) as HTMLTextAreaElement | null;
    const sendButton = document.querySelector(
      'button[aria-label="Send message"]',
    ) as HTMLButtonElement | null;

    expect(textarea).not.toBeNull();
    expect(sendButton).not.toBeNull();

    typeIn(textarea!, 'cambiale por "sarasa" de color celeste');
    sendButton?.click();

    await waitFor(() => {
      const userMessage = useCanvasStore
        .getState()
        .messages.find((message) => message.role === "user");

      expect(userMessage?.content).toBe(
        'cambiale por "sarasa" de color celeste',
      );
      expect(userMessage?.content).not.toContain("ELEMENT TO EDIT");
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  it("sends only the targeted slide html when editing a referenced element", async () => {
    const firstSlideId = useCanvasStore
      .getState()
      .addSlide(0, "<section><h2>Hola!</h2></section>", "openai", 1);
    useCanvasStore
      .getState()
      .addSlide(1, "<section><p>Otra slide</p></section>", "openai", 1);
    useCanvasStore.getState().setGlobalStyles("h2 { color: red; }");

    useCanvasStore.getState().setElementReference({
      slideId: firstSlideId,
      variantId: 1,
      slideIndex: 0,
      cssPath: "section > h2",
      tag: "h2",
      label: "Heading",
      contentPreview: "Hola!",
      outerHtml: "<h2>Hola!</h2>",
    });

    renderWithQuery(<ChatSidebar />);

    const textarea = document.querySelector(
      'textarea[aria-label="Message for AI assistant"]',
    ) as HTMLTextAreaElement | null;
    const sendButton = document.querySelector(
      'button[aria-label="Send message"]',
    ) as HTMLButtonElement | null;

    expect(textarea).not.toBeNull();
    expect(sendButton).not.toBeNull();

    typeIn(textarea!, "cambiale el color");
    sendButton?.click();

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(1);
      const [params] = sendMessage.mock.calls[0] ?? [];
      expect(params.currentHtml).toContain("<!-- GLOBAL STYLES -->");
      expect(params.currentHtml).toContain("<section><h2>Hola!</h2></section>");
      expect(params.currentHtml).not.toContain(
        "<section><p>Otra slide</p></section>",
      );
      expect(params.mode).toBe("element-edit");
      expect(params.messages.at(-1)?.content).toContain("ELEMENT TO EDIT");
      expect(params.messages.at(-1)?.content).toContain("updatedOuterHtml");
    });
  });

  it("shows selected slide chips and sends only selected slides for general chat", async () => {
    const firstSlideId = useCanvasStore
      .getState()
      .addSlide(0, "<section><h2>Uno</h2></section>", "openai", 1);
    useCanvasStore
      .getState()
      .addSlide(1, "<section><p>Dos</p></section>", "openai", 1);
    const thirdSlideId = useCanvasStore
      .getState()
      .addSlide(2, "<section><p>Tres</p></section>", "openai", 1);

    useCanvasStore.getState().setSelectedSlideIds([firstSlideId, thirdSlideId]);

    renderWithQuery(<ChatSidebar />);

    await waitFor(() => {
      expect(document.body.textContent).toContain("Working on");
      expect(document.body.textContent).toContain("1");
      expect(document.body.textContent).toContain("3");
    });

    const textarea = document.querySelector(
      'textarea[aria-label="Message for AI assistant"]',
    ) as HTMLTextAreaElement | null;
    const sendButton = document.querySelector(
      'button[aria-label="Send message"]',
    ) as HTMLButtonElement | null;

    expect(textarea).not.toBeNull();
    expect(sendButton).not.toBeNull();

    typeIn(textarea!, "trabajá estas slides");
    sendButton?.click();

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(1);
      const [params] = sendMessage.mock.calls[0] ?? [];
      expect(params.mode).toBe("build");
      expect(params.currentHtml).toContain("<section><h2>Uno</h2></section>");
      expect(params.currentHtml).toContain("<section><p>Tres</p></section>");
      expect(params.currentHtml).not.toContain("<section><p>Dos</p></section>");
    });
  });

  it("shows a safe fallback message when an element patch cannot be applied", async () => {
    const slideId = useCanvasStore
      .getState()
      .addSlide(0, "<section><h2>Hola!</h2></section>", "openai", 1);

    useCanvasStore.getState().setElementReference({
      slideId,
      variantId: 1,
      slideIndex: 0,
      cssPath: "section > h2",
      tag: "h2",
      label: "Heading",
      contentPreview: "Hola!",
      outerHtml: "<h2>Hola!</h2>",
    });

    onElementPatch.mockReturnValue({
      applied: false,
      error: "No pude aplicar el cambio de forma segura.",
    } as { applied: boolean; error?: string });
    sendMessage.mockImplementation(
      async (
        _params,
        callbacks: {
          onElementPatch: (
            slideIndex: number,
            cssPath: string,
            updatedOuterHtml: string,
          ) => void;
          onDone: () => void;
        },
      ) => {
        callbacks.onElementPatch(0, "section > h2", "<h2>Nuevo</h2>");
        callbacks.onDone();
      },
    );

    renderWithQuery(<ChatSidebar />);

    const textarea = document.querySelector(
      'textarea[aria-label="Message for AI assistant"]',
    ) as HTMLTextAreaElement | null;
    const sendButton = document.querySelector(
      'button[aria-label="Send message"]',
    ) as HTMLButtonElement | null;

    expect(textarea).not.toBeNull();
    expect(sendButton).not.toBeNull();

    typeIn(textarea!, "cambiale el texto");
    sendButton?.click();

    await waitFor(() => {
      const assistantMessage = useCanvasStore
        .getState()
        .messages.find((message) => message.role === "assistant");
      expect(assistantMessage?.content).toBe(
        "No pude aplicar el cambio de forma segura.",
      );
    });

    expect(
      useCanvasStore
        .getState()
        .messages.find((message) => message.role === "assistant")?.content,
    ).not.toContain("<h2>Nuevo</h2>");
  });
});
