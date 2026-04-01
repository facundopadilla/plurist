import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCanvasStore } from "../features/canvas/canvas-store";
import {
  ProjectDropdown,
  ProviderDropdown,
} from "../features/canvas/header-dropdowns";
import { fetchProjects } from "../features/projects/api";
import {
  fetchFormats,
  fetchOllamaModels,
  fetchProviders,
} from "../features/generation/api";
import {
  cleanupDom,
  press,
  renderWithQuery,
  textExists,
  waitFor,
} from "./test-dom";

vi.mock("../features/projects/api", () => ({
  fetchProjects: vi.fn(),
}));

vi.mock("../features/generation/api", () => ({
  fetchFormats: vi.fn(),
  fetchProviders: vi.fn(),
  fetchOllamaModels: vi.fn(),
}));

vi.mock("../features/settings/ai-providers/api", () => ({
  fetchAISettings: vi.fn(),
  saveAISettings: vi.fn(),
}));

describe("canvas header dropdowns", () => {
  afterEach(() => {
    cleanupDom();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    const state = useCanvasStore.getState();
    useCanvasStore.setState({
      ...state,
      config: {
        ...state.config,
        projectId: null,
        network: null,
        formatKey: "",
        formatWidth: 1080,
        formatHeight: 1080,
        selectedProviders: [],
        selectedModels: {},
      },
    });

    vi.mocked(fetchProjects).mockResolvedValue([
      {
        id: 7,
        name: "Project Atlas",
        description: "Main brand system",
        color: "#6366f1",
        icon_url: "",
        tags: [],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(fetchProviders).mockResolvedValue(["openai", "ollama"]);
    vi.mocked(fetchOllamaModels).mockResolvedValue([
      { name: "llama3", display_name: "Llama 3" },
      { name: "mistral", display_name: "Mistral" },
    ]);
    vi.mocked(fetchFormats).mockResolvedValue([]);
  });

  it("selects a project from the shared dropdown menu", async () => {
    const view = renderWithQuery(<ProjectDropdown />);

    await waitFor(() => {
      expect(vi.mocked(fetchProjects)).toHaveBeenCalled();
    });

    const trigger = view.container.querySelector("button");
    expect(trigger).not.toBeNull();

    press(trigger!);

    await waitFor(() => {
      expect(textExists("Project Atlas")).toBe(true);
    });

    const item = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).find((node) => node.textContent?.includes("Project Atlas"));

    expect(item).not.toBeUndefined();
    press(item!);

    await waitFor(() => {
      expect(useCanvasStore.getState().config.projectId).toBe(7);
    });
  });

  it("renders provider checkbox items and ollama model availability", async () => {
    const view = renderWithQuery(<ProviderDropdown />);

    const trigger = view.container.querySelector("button");
    expect(trigger).not.toBeNull();

    press(trigger!);

    await waitFor(() => {
      expect(textExists("openai")).toBe(true);
      expect(textExists("ollama")).toBe(true);
      expect(textExists("2 models")).toBe(true);
    });

    const checkboxItem = Array.from(
      document.querySelectorAll('[role="menuitemcheckbox"]'),
    ).find((node) => node.textContent?.includes("ollama"));

    expect(checkboxItem).not.toBeUndefined();
    press(checkboxItem!);

    await waitFor(() => {
      expect(useCanvasStore.getState().config.selectedProviders).toContain(
        "ollama",
      );
    });
  });
});
