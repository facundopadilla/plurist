import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../features/auth/auth-context";
import { AIProvidersPage } from "../features/settings/ai-providers/ai-providers-page";
import {
  fetchAISettings,
  saveAISettings,
  testOllamaConnection,
} from "../features/settings/ai-providers/api";
import {
  cleanupDom,
  getButtonByText,
  press,
  renderWithQuery,
  textExists,
  typeIn,
  waitFor,
} from "./test-dom";

vi.mock("../features/settings/ai-providers/api", () => ({
  fetchAISettings: vi.fn(),
  saveAISettings: vi.fn(),
  testOllamaConnection: vi.fn(),
}));

const ownerAuthValue = {
  user: { email: "owner@test.com", name: "Owner", role: "owner" as const },
  role: "owner" as const,
  isOwner: true,
  isEditor: false,
  isPublisher: false,
  isLoading: false,
  error: null,
  refresh: async () => {},
};

function renderPage() {
  return renderWithQuery(
    <AuthContext.Provider value={ownerAuthValue}>
      <AIProvidersPage />
    </AuthContext.Provider>,
  );
}

describe("AIProvidersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fetchAISettings).mockResolvedValue({
      has_openai_key: true,
      has_anthropic_key: false,
      has_gemini_key: false,
      has_openrouter_key: false,
      ollama_base_url: "http://localhost:11434",
      preferred_models: {},
    });
    vi.mocked(saveAISettings).mockResolvedValue({
      has_openai_key: true,
      has_anthropic_key: false,
      has_gemini_key: false,
      has_openrouter_key: false,
      ollama_base_url: "http://localhost:11434",
      preferred_models: {},
    });
    vi.mocked(testOllamaConnection).mockResolvedValue([
      { name: "llama3", display_name: "Llama 3" },
    ]);
  });

  afterEach(() => {
    cleanupDom();
  });

  it("renders migrated badge surfaces for configured and unset providers", async () => {
    renderPage();

    await waitFor(() => {
      expect(textExists("AI Providers")).toBe(true);
      expect(textExists("Configured")).toBe(true);
      expect(textExists("Not set")).toBe(true);
    });

    const badges = Array.from(document.querySelectorAll("div,span")).filter(
      (node) =>
        node.className.includes("inline-flex") &&
        (node.textContent?.includes("Configured") ||
          node.textContent?.includes("Not set")),
    );

    expect(badges.length).toBeGreaterThan(0);
  });

  it("saves an updated provider key through the shared form controls", async () => {
    renderPage();

    await waitFor(() => {
      expect(vi.mocked(fetchAISettings)).toHaveBeenCalled();
      expect(document.querySelectorAll('input[type="password"]').length).toBe(
        4,
      );
    });

    const firstPasswordInput = document.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement | null;

    expect(firstPasswordInput).not.toBeNull();
    typeIn(firstPasswordInput!, "sk-test-123");

    press(getButtonByText("Save"));

    await waitFor(() => {
      expect(vi.mocked(saveAISettings)).toHaveBeenCalled();
      expect(vi.mocked(saveAISettings).mock.calls[0]?.[0]).toEqual({
        openai_api_key: "sk-test-123", // pragma: allowlist secret
      });
    });
  });

  it("shows a shared success alert after testing the Ollama connection", async () => {
    vi.mocked(testOllamaConnection).mockResolvedValue([
      { name: "llama3", display_name: "Llama 3" },
      { name: "mistral", display_name: "Mistral" },
    ]);

    renderPage();

    await waitFor(() => {
      expect(textExists("Ollama")).toBe(true);
    });

    press(getButtonByText("Test"));

    await waitFor(() => {
      expect(vi.mocked(testOllamaConnection)).toHaveBeenCalled();
      expect(textExists("Connected. 2 models available.")).toBe(true);
    });
  });
});
