import { cn } from "../../../lib/utils";
import type { ChatMessage } from "../types";

interface ChatMessageProps {
  message: ChatMessage;
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

function renderAssistantContent(content: string) {
  const lines = content.split(/\r?\n/);
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;

    elements.push(
      <ul key={key} className="list-disc pl-5 space-y-1">
        {listItems.map((item, index) => (
          <li key={`${key}-${index}`}>{renderInline(item)}</li>
        ))}
      </ul>,
    );

    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(`list-${index}`);
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList(`list-${index}`);

    if (line.startsWith("### ")) {
      elements.push(
        <h4
          key={`h3-${index}`}
          className="text-sm font-semibold text-foreground"
        >
          {renderInline(line.slice(4))}
        </h4>,
      );
      return;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={`h2-${index}`}
          className="text-sm font-semibold text-foreground"
        >
          {renderInline(line.slice(3))}
        </h3>,
      );
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h2
          key={`h1-${index}`}
          className="text-sm font-semibold text-foreground"
        >
          {renderInline(line.slice(2))}
        </h2>,
      );
      return;
    }

    elements.push(
      <p key={`p-${index}`} className="whitespace-pre-wrap break-words">
        {renderInline(line)}
      </p>,
    );
  });

  flushList("list-final");

  if (elements.length === 0) {
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }

  return <div className="space-y-2">{elements}</div>;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-md px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          renderAssistantContent(message.content)
        )}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current animate-pulse rounded-sm" />
        )}
      </div>

      {/* HTML block indicators */}
      {message.htmlBlocks.length > 0 && (
        <div className="flex flex-wrap gap-1 max-w-[85%]">
          {message.htmlBlocks.map((block) => (
            <span
              key={block.slideIndex}
              className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium"
            >
              Slide {block.slideIndex + 1} generado
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
