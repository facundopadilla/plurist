import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { useCanvasStore } from "../canvas-store";
import { useChatStream } from "./use-chat-stream";
import { useChatToCanvas } from "../hooks/use-chat-to-canvas";
import { ProviderDropdown, ModelDropdown } from "../header-dropdowns";
import { cn } from "../../../lib/utils";
import type { ChatMessage } from "../types";
import { ChatMessageBubble } from "./chat-message";

function containsHtmlLikeContent(content: string): boolean {
  return /<(html|body|div|section|p|h[1-6]|style|svg|figure)\b/i.test(content);
}

export function ChatSidebar() {
  const messages = useCanvasStore((s) => s.messages);
  const isStreaming = useCanvasStore((s) => s.isStreaming);
  const addMessage = useCanvasStore((s) => s.addMessage);
  const updateLastMessage = useCanvasStore((s) => s.updateLastMessage);
  const setIsStreaming = useCanvasStore((s) => s.setIsStreaming);
  const config = useCanvasStore((s) => s.config);
  const conversationId = useCanvasStore((s) => s.conversationId);
  const chatMode = useCanvasStore((s) => s.chatMode);
  const setChatMode = useCanvasStore((s) => s.setChatMode);

  const { sendMessage } = useChatStream();
  const { onHtmlBlock } = useChatToCanvas();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      htmlBlocks: [],
      createdAt: new Date(),
    };
    addMessage(userMsg);
    setInput("");

    // Add placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      htmlBlocks: [],
      isStreaming: true,
      createdAt: new Date(),
    };
    addMessage(assistantMsg);
    setIsStreaming(true);
    contentRef.current = "";

    // Build messages list for the API from store history
    const storeMessages = useCanvasStore.getState().messages;
    const apiMessages = storeMessages
      .filter((m) => {
        if (m.role === "user") return true;
        if (m.role !== "assistant" || !m.content) return false;

        if (chatMode === "plan") {
          if (m.htmlBlocks.length > 0) return false;
          if (containsHtmlLikeContent(m.content)) return false;
        }

        return true;
      })
      .map((m) => ({ role: m.role, content: m.content }));

    const provider = config.selectedProviders[0] ?? "openai";
    const modelId = config.selectedModels?.[provider] ?? null;

    void sendMessage(
      {
        conversationId,
        messages: apiMessages,
        provider,
        modelId,
        projectId: config.projectId,
        formatKey: config.formatKey,
        network: config.network,
        mode: chatMode,
      },
      {
        onToken: (token) => {
          contentRef.current += token;
          updateLastMessage({ content: contentRef.current });
        },
        onHtmlBlock: (slideIndex, html) => {
          onHtmlBlock(slideIndex, html, provider);
          updateLastMessage({
            htmlBlocks: [
              ...(useCanvasStore.getState().messages.at(-1)?.htmlBlocks ?? []),
              { slideIndex, html },
            ],
          });
        },
        onDone: () => {
          updateLastMessage({ isStreaming: false });
          setIsStreaming(false);
        },
        onError: (message) => {
          updateLastMessage({
            content: contentRef.current || `Error: ${message}`,
            isStreaming: false,
          });
          setIsStreaming(false);
        },
      },
    );
  }, [
    input,
    isStreaming,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    config,
    conversationId,
    sendMessage,
    onHtmlBlock,
    chatMode,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab" && input === "") {
        e.preventDefault();
        setChatMode(chatMode === "plan" ? "build" : "plan");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, input, chatMode, setChatMode],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-2 px-3 pt-3 pb-2 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium text-foreground">Chat IA</span>
        <div className="flex items-center gap-2 flex-wrap">
          <ProviderDropdown />
          <ModelDropdown />
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex-shrink-0 px-3 pt-2 pb-1">
        <div
          className="inline-flex rounded-md border border-border bg-muted p-0.5 gap-0.5"
          role="group"
          aria-label="Modo de chat"
        >
          <button
            type="button"
            onClick={() => setChatMode("plan")}
            aria-pressed={chatMode === "plan"}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              chatMode === "plan"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Planear 🧠
          </button>
          <button
            type="button"
            onClick={() => setChatMode("build")}
            aria-pressed={chatMode === "build"}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              chatMode === "build"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Construir 🏗️
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            {chatMode === "plan"
              ? "Usá Planear para conversar ideas, copy y dirección creativa."
              : "Usá Construir para generar slides directamente en el canvas."}
          </p>
        )}
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            chatMode === "plan"
              ? "Describí tu estrategia..."
              : "Escribe un prompt..."
          }
          aria-label="Mensaje para el asistente IA"
          disabled={isStreaming}
          rows={2}
          className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          aria-label="Enviar mensaje"
          className="self-end flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
