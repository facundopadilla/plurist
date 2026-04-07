import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  KeyRound,
  Gauge,
  ShieldAlert,
  ServerCrash,
  Wifi,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import type { ChatMessage } from "../types";

interface ChatMessageProps {
  message: ChatMessage;
}

const THINKING_TEXTS = [
  "Thinking...",
  "Building...",
  "Analyzing...",
  "Generating...",
  "Processing...",
  "Crafting...",
];

function ThinkingIndicator() {
  const [text, setText] = useState("Thinking...");

  useEffect(() => {
    setText(THINKING_TEXTS[Math.floor(Math.random() * THINKING_TEXTS.length)]);
  }, []);

  return (
    <div className="relative flex items-center gap-3 py-1 pl-1 pr-2">
      <div className="absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 animate-[spin_3s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,red,orange,yellow,green,blue,indigo,violet,red)] opacity-50 blur-[6px]" />
      <div className="relative flex h-3 w-3 items-center justify-center">
        <div className="h-full w-full animate-spin rounded-full border-2 border-zinc-500 border-t-purple-400" />
      </div>
      <span className="relative bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-sm font-medium text-transparent animate-pulse">
        {text}
      </span>
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function renderAssistantContent(content: string, isStreaming: boolean) {
  const lines = content.split(/\r?\n/);
  const elements: React.ReactElement[] = [];
  let listItems: string[] = [];

  const cursor = isStreaming ? (
    <span className="ml-1 inline-block h-3.5 w-2 animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite] bg-zinc-300 align-middle" />
  ) : null;

  const flushList = (key: string, isLast = false) => {
    if (listItems.length === 0) return;

    elements.push(
      <ul key={key} className="list-disc space-y-1 pl-5">
        {listItems.map((item, index) => {
          const isLastItem = isLast && index === listItems.length - 1;
          return (
            <li key={`${key}-${index}`}>
              {renderInline(item)}
              {isLastItem && cursor}
            </li>
          );
        })}
      </ul>,
    );

    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const isLast = index === lines.length - 1;
    const line = rawLine.trim();

    if (!line) {
      flushList(`list-${index}`);
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      if (isLast) {
        flushList(`list-${index}`, true);
      }
      return;
    }

    flushList(`list-${index}`);

    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={`h3-${index}`} className="text-sm font-semibold text-zinc-50">
          {renderInline(line.slice(4))}
          {isLast && cursor}
        </h4>,
      );
      return;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={`h2-${index}`} className="text-sm font-semibold text-zinc-50">
          {renderInline(line.slice(3))}
          {isLast && cursor}
        </h3>,
      );
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={`h1-${index}`} className="text-sm font-semibold text-zinc-50">
          {renderInline(line.slice(2))}
          {isLast && cursor}
        </h2>,
      );
      return;
    }

    elements.push(
      <p key={`p-${index}`} className="whitespace-pre-wrap break-words">
        {renderInline(line)}
        {isLast && cursor}
      </p>,
    );
  });

  flushList("list-final", true);

  if (elements.length === 0) {
    return (
      <p className="whitespace-pre-wrap break-words">
        {content}
        {cursor}
      </p>
    );
  }

  return <div className="space-y-2">{elements}</div>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  auth: <KeyRound size={16} />,
  limit: <Gauge size={16} />,
  content: <ShieldAlert size={16} />,
  provider: <ServerCrash size={16} />,
  network: <Wifi size={16} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  auth: "border-amber-500/30 bg-amber-500/[0.06]",
  limit: "border-orange-500/30 bg-orange-500/[0.06]",
  content: "border-violet-500/30 bg-violet-500/[0.06]",
  provider: "border-red-500/30 bg-red-500/[0.06]",
  network: "border-sky-500/30 bg-sky-500/[0.06]",
};

const CATEGORY_ICON_COLORS: Record<string, string> = {
  auth: "text-amber-400",
  limit: "text-orange-400",
  content: "text-violet-400",
  provider: "text-red-400",
  network: "text-sky-400",
};

function ErrorCard({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: () => void;
}) {
  const error = message.error;
  if (!error) return null;

  const category = error.category || "provider";
  const icon = CATEGORY_ICONS[category] ?? <AlertTriangle size={16} />;
  const borderBg =
    CATEGORY_COLORS[category] ?? "border-red-500/30 bg-red-500/[0.06]";
  const iconColor = CATEGORY_ICON_COLORS[category] ?? "text-red-400";

  return (
    <div className={cn("max-w-[85%] rounded-lg border p-3", borderBg)}>
      <div className="flex items-start gap-2.5">
        <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>{icon}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-zinc-100">
            {message.content || error.hint || "Something went wrong"}
          </p>
          {error.hint && message.content && (
            <p className="text-xs text-zinc-400">{error.hint}</p>
          )}
          {error.retryable && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-zinc-50"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          )}
        </div>
      </div>
      {(message.provider || error.code) && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
          {message.provider && (
            <span className="capitalize">{message.provider}</span>
          )}
          {error.code && error.code !== "unknown" && (
            <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 font-mono">
              {error.code}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const targetContent = useMemo(() => {
    if (isUser) return message.content;
    let text = message.content;

    // Remover bloques de código markdown de la vista (dejando solo el texto conversacional)
    text = text.replace(/```[\s\S]*?(?:```|$)/g, "").trim();

    // Si el texto restante parece ser HTML crudo que se filtró sin backticks
    if (
      message.htmlBlocks.length > 0 &&
      /<(div|svg|section|main|button|nav|header|form)\b/i.test(text)
    ) {
      text = "";
    }

    // Si quedó vacío pero sabemos que está generando o generó código
    if (
      !text &&
      (message.htmlBlocks.length > 0 ||
        message.content.includes("```") ||
        /<(div|svg|section|main|button|nav)\b/i.test(message.content))
    ) {
      if (message.isStreaming) {
        return "Construyendo la interfaz...";
      }
      return "✨ He generado el contenido como lo pediste.";
    }

    return text;
  }, [message.content, isUser, message.htmlBlocks.length, message.isStreaming]);

  const [displayedContent, setDisplayedContent] = useState(() => {
    if (isUser) return targetContent;
    // Si ya no está streameando y tiene contenido (ej: historial), lo mostramos de una
    if (!message.isStreaming && message.content) return targetContent;
    return "";
  });

  useEffect(() => {
    if (isUser) {
      setDisplayedContent(targetContent);
      return;
    }

    // Si el texto cambió por completo (ej: pasó del "Construyendo..." al fallback final), hacemos un snap
    if (!targetContent.startsWith(displayedContent)) {
      setDisplayedContent(targetContent);
      return;
    }

    // Efecto Typewriter sobre el texto parseado y limpio
    if (displayedContent.length < targetContent.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent((prev) => {
          // Simulamos velocidad de escritura rápida de a 2-5 caracteres por tick
          const charsToAdd = Math.floor(Math.random() * 4) + 2;
          return targetContent.slice(0, prev.length + charsToAdd);
        });
      }, 15); // Cada 15ms entra un "chunk"

      return () => clearTimeout(timeout);
    }
  }, [targetContent, displayedContent, isUser]);

  // Consideramos que está escribiendo si el streaming de la red está activo O si nuestra animación local no terminó
  const isTyping =
    message.isStreaming || displayedContent.length < targetContent.length;

  // Error messages get a dedicated card instead of the normal bubble
  if (!isUser && message.error) {
    return (
      <div className="flex flex-col gap-1 items-start">
        <ErrorCard message={message} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-zinc-50 text-zinc-900 shadow-[0_1px_0_rgba(255,255,255,0.18)]"
            : "border border-zinc-800/70 bg-zinc-900/90 text-zinc-100",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : isTyping && !displayedContent ? (
          <ThinkingIndicator />
        ) : (
          renderAssistantContent(displayedContent, isTyping)
        )}
      </div>

      {message.htmlBlocks.length > 0 && (
        <div className="flex max-w-[85%] flex-wrap gap-1">
          {message.htmlBlocks.map((block) => (
            <span
              key={block.slideIndex}
              className="rounded-md border border-zinc-800/70 bg-zinc-900/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300"
            >
              Slide {block.slideIndex + 1} generado
            </span>
          ))}
        </div>
      )}

      {!isUser && (message.provider || message.modelId) && (
        <div className="pl-1 text-[10px] font-medium text-zinc-500">
          <span className="capitalize">{message.provider}</span>
          {message.modelId && (
            <span className="opacity-70">
              {" "}
              · {message.modelId.split("/").pop()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
