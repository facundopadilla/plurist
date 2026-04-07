import { useCallback, useRef } from "react";
import { getCsrfToken, setCsrfToken } from "../../auth/csrf";
import type {
  ChatStreamCallbacks,
  ChatStreamErrorEvent,
  ChatStreamEvent,
} from "./chat-types";

interface ChatStreamParams {
  conversationId: number | null;
  messages: Array<{ role: string; content: string }>;
  provider: string;
  modelId?: string | null;
  projectId: number | null;
  formatKey: string;
  network: string | null;
  mode: "plan" | "build" | "element-edit";
  currentHtml?: string;
}

async function ensureCsrf(): Promise<string> {
  const existing = getCsrfToken();
  if (existing) return existing;
  const res = await fetch("/api/v1/auth/csrf", { credentials: "include" });
  const data = (await res.json()) as { csrf_token?: string };
  if (data.csrf_token) setCsrfToken(data.csrf_token);
  return getCsrfToken();
}

/** Parse a single SSE event block (e.g. "event: token\ndata: {...}") into a ChatStreamEvent */
function parseSSEBlock(block: string): ChatStreamEvent | null {
  const lines = block.split("\n");
  let eventType = "";
  let dataStr = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      dataStr = line.slice(6).trim();
    }
  }

  if (!eventType || !dataStr) return null;

  try {
    const data = JSON.parse(dataStr) as Record<string, unknown>;
    switch (eventType) {
      case "token":
        return { type: "token", text: String(data.text ?? "") };
      case "html_block":
        return {
          type: "html_block",
          slide_index: Number(data.slide_index ?? 0),
          html: String(data.html ?? ""),
        };
      case "element_patch":
        return {
          type: "element_patch",
          slide_index: Number(data.slide_index ?? 0),
          css_path: String(data.css_path ?? ""),
          updated_outer_html: String(data.updated_outer_html ?? ""),
        };
      case "done":
        return { type: "done" };
      case "error":
        return {
          type: "error",
          message: String(data.message ?? "Unknown error"),
          code: data.code ? String(data.code) : undefined,
          category: data.category ? String(data.category) : undefined,
          hint: data.hint ? String(data.hint) : undefined,
          retryable:
            typeof data.retryable === "boolean" ? data.retryable : undefined,
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function useChatStream() {
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (params: ChatStreamParams, callbacks: ChatStreamCallbacks) => {
      // Cancel any in-flight stream
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      const csrf = await ensureCsrf();

      let response: Response;
      try {
        response = await fetch("/api/v1/generation/chat/stream", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf,
          },
          body: JSON.stringify({
            conversation_id: params.conversationId,
            messages: params.messages,
            provider: params.provider,
            model_id: params.modelId ?? null,
            project_id: params.projectId,
            format: params.formatKey,
            network: params.network ?? "",
            mode: params.mode,
            current_html: params.currentHtml ?? "",
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          callbacks.onError({
            type: "error",
            message: "Server connection error",
          });
        }
        return;
      }

      if (!response.ok || !response.body) {
        callbacks.onError({
          type: "error",
          message: `Server error: ${response.status}`,
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          streamDone = done;

          if (streamDone) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // SSE events are separated by double newlines
          const blocks = buffer.split("\n\n");
          // Keep last incomplete block in buffer
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            if (!block.trim()) continue;
            const event = parseSSEBlock(block);
            if (!event) continue;

            switch (event.type) {
              case "token":
                callbacks.onToken(event.text);
                break;
              case "html_block":
                callbacks.onHtmlBlock(event.slide_index, event.html);
                break;
              case "element_patch":
                callbacks.onElementPatch(
                  event.slide_index,
                  event.css_path,
                  event.updated_outer_html,
                );
                break;
              case "done":
                callbacks.onDone();
                return;
              case "error":
                callbacks.onError(event as ChatStreamErrorEvent);
                return;
            }
          }
        }
        // Stream ended without explicit done
        callbacks.onDone();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          callbacks.onError({
            type: "error",
            message: "Stream interrupted",
          });
        }
      } finally {
        reader.releaseLock();
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  return { sendMessage, cancel };
}

export async function streamChatMessage(
  params: ChatStreamParams,
  callbacks: ChatStreamCallbacks,
) {
  const csrf = await ensureCsrf();

  let response: Response;
  try {
    response = await fetch("/api/v1/generation/chat/stream", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
      body: JSON.stringify({
        conversation_id: params.conversationId,
        messages: params.messages,
        provider: params.provider,
        model_id: params.modelId ?? null,
        project_id: params.projectId,
        format: params.formatKey,
        network: params.network ?? "",
        mode: params.mode,
        current_html: params.currentHtml ?? "",
      }),
    });
  } catch {
    callbacks.onError({
      type: "error",
      message: "Server connection error",
    });
    return;
  }

  if (!response.ok || !response.body) {
    callbacks.onError({
      type: "error",
      message: `Server error: ${response.status}`,
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      streamDone = done;

      if (streamDone) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        if (!block.trim()) continue;
        const event = parseSSEBlock(block);
        if (!event) continue;

        switch (event.type) {
          case "token":
            callbacks.onToken(event.text);
            break;
          case "html_block":
            callbacks.onHtmlBlock(event.slide_index, event.html);
            break;
          case "element_patch":
            callbacks.onElementPatch(
              event.slide_index,
              event.css_path,
              event.updated_outer_html,
            );
            break;
          case "done":
            callbacks.onDone();
            return;
          case "error":
            callbacks.onError(event as ChatStreamErrorEvent);
            return;
        }
      }
    }

    callbacks.onDone();
  } catch {
    callbacks.onError({
      type: "error",
      message: "Stream interrupted",
    });
  } finally {
    reader.releaseLock();
  }
}
