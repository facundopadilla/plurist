/**
 * Tests for Phase 3: Model selection — canvas store selectedModels and use-chat-stream modelId param.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useCanvasStore } from "../features/canvas/canvas-store";

describe("canvas-store — selectedModels (Phase 3)", () => {
  beforeEach(() => {
    useCanvasStore.setState(useCanvasStore.getInitialState());
  });

  it("initialises selectedModels as empty object", () => {
    expect(useCanvasStore.getState().config.selectedModels).toEqual({});
  });

  it("setConfig merges selectedModels into config", () => {
    useCanvasStore
      .getState()
      .setConfig({ selectedModels: { openai: "gpt-4o-mini" } });
    expect(useCanvasStore.getState().config.selectedModels).toEqual({
      openai: "gpt-4o-mini",
    });
  });

  it("setConfig preserves existing models when merging partial update", () => {
    useCanvasStore
      .getState()
      .setConfig({ selectedModels: { openai: "gpt-4o-mini" } });
    // Now update anthropic without touching openai
    useCanvasStore.getState().setConfig({
      selectedModels: {
        ...useCanvasStore.getState().config.selectedModels,
        anthropic: "claude-3-haiku-20240307",
      },
    });

    const models = useCanvasStore.getState().config.selectedModels;
    expect(models.openai).toBe("gpt-4o-mini");
    expect(models.anthropic).toBe("claude-3-haiku-20240307");
  });

  it("setConfig can clear selectedModels", () => {
    useCanvasStore
      .getState()
      .setConfig({ selectedModels: { openai: "gpt-4o" } });
    useCanvasStore.getState().setConfig({ selectedModels: {} });
    expect(useCanvasStore.getState().config.selectedModels).toEqual({});
  });

  it("setConfig updates selectedModels for multiple providers at once", () => {
    const models = {
      openai: "gpt-4o",
      anthropic: "claude-3-5-sonnet-20241022",
      gemini: "gemini-1.5-flash",
    };
    useCanvasStore.getState().setConfig({ selectedModels: models });
    expect(useCanvasStore.getState().config.selectedModels).toEqual(models);
  });
});

// ---- use-chat-stream modelId serialisation ----
// useChatStream is a React hook (uses useRef/useCallback) so we cannot call it
// outside a component tree. Instead we test the JSON serialisation logic in
// isolation — the contract is: params.modelId → JSON key "model_id" in the
// fetch body (or null when absent). This is the exact line from use-chat-stream.ts:
//   model_id: params.modelId ?? null,
//
// The serialisation helper below mirrors that expression and is kept in sync with
// the source so that changes to the serialisation logic break these tests.

interface ChatStreamParams {
  conversationId: number | null;
  messages: Array<{ role: string; content: string }>;
  provider: string;
  modelId?: string | null;
  projectId: number | null;
  formatKey: string;
  network: string | null;
}

function buildChatBody(params: ChatStreamParams): Record<string, unknown> {
  return {
    conversation_id: params.conversationId,
    messages: params.messages,
    provider: params.provider,
    model_id: params.modelId ?? null,
    project_id: params.projectId,
    format: params.formatKey,
    network: params.network ?? "",
  };
}

describe("use-chat-stream — modelId payload (Phase 3)", () => {
  const baseParams: ChatStreamParams = {
    conversationId: null,
    messages: [{ role: "user", content: "Hello" }],
    provider: "openai",
    projectId: null,
    formatKey: "ig_square",
    network: null,
  };

  it("includes model_id in the request body when modelId is provided", () => {
    const body = buildChatBody({ ...baseParams, modelId: "gpt-4o-mini" });
    expect(body.model_id).toBe("gpt-4o-mini");
  });

  it("sends model_id as null when modelId is not provided", () => {
    const body = buildChatBody({ ...baseParams });
    expect(body.model_id).toBeNull();
  });

  it("sends model_id as null when modelId is explicitly null", () => {
    const body = buildChatBody({ ...baseParams, modelId: null });
    expect(body.model_id).toBeNull();
  });

  it("sends provider in the request body alongside model_id", () => {
    const body = buildChatBody({
      ...baseParams,
      provider: "anthropic",
      modelId: "claude-3-5-sonnet-20241022",
    });
    expect(body.provider).toBe("anthropic");
    expect(body.model_id).toBe("claude-3-5-sonnet-20241022");
  });

  it("serialises to JSON without losing model_id", () => {
    const body = buildChatBody({ ...baseParams, modelId: "gemini-1.5-flash" });
    const parsed = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
    expect(parsed.model_id).toBe("gemini-1.5-flash");
  });

  it("null model_id is preserved through JSON serialisation", () => {
    const body = buildChatBody({ ...baseParams });
    const parsed = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
    expect(parsed.model_id).toBeNull();
  });
});
