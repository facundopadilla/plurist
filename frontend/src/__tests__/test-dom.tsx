import type React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query";

// React 18 warns unless the environment declares act() support.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const [firstArg] = args;

  if (
    typeof firstArg === "string" &&
    firstArg.includes("not wrapped in act(...)")
  ) {
    return;
  }

  originalConsoleError(...args);
};

if (!("PointerEvent" in window)) {
  // Radix primitives rely on pointer events for menu triggers.
  // JSDOM doesn't implement PointerEvent, so we fall back to MouseEvent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).PointerEvent = MouseEvent;
}

if (!("ResizeObserver" in window)) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = ResizeObserverMock;
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

export interface RenderedView {
  container: HTMLDivElement;
  root: Root;
  queryClient?: QueryClient;
}

export function render(ui: React.ReactElement): RenderedView {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return { container, root };
}

export function renderWithQuery(
  ui: React.ReactElement,
  config?: QueryClientConfig,
): RenderedView {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    ...config,
  });

  const view = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );

  return { ...view, queryClient };
}

export function cleanupDom(view?: RenderedView) {
  if (view) {
    act(() => {
      view.root.unmount();
    });
  }

  document.body.innerHTML = "";
}

export async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

export async function waitFor(assertion: () => void, timeout = 2000) {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt <= timeout) {
    await act(async () => {
      await Promise.resolve();
    });

    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  }

  throw lastError;
}

export function press(target: Element) {
  act(() => {
    target.dispatchEvent(
      new window.PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        ctrlKey: false,
      }),
    );
    target.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      }),
    );
  });
}

export function typeIn(
  target: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const prototype = Object.getPrototypeOf(target);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  act(() => {
    descriptor?.set?.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export function textExists(text: string) {
  return document.body.textContent?.includes(text) ?? false;
}

export function getButtonByText(text: string) {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(text),
  );

  if (!button) {
    throw new Error(`Button not found: ${text}`);
  }

  return button as HTMLButtonElement;
}
