import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

import { FloatingToolbar } from "../features/canvas/shapes/floating-toolbar";
import type { ElementSelection } from "../features/canvas/shapes/inline-edit-controller";
import { cleanupDom, render, waitFor } from "./test-dom";

function createSelection(element: HTMLElement): ElementSelection {
  return {
    element,
    type: "text",
    rect: new DOMRect(100, 100, 120, 24),
    styles: {
      fontFamily: window.getComputedStyle(element).fontFamily,
      fontSize: window.getComputedStyle(element).fontSize || "16px",
      fontWeight: window.getComputedStyle(element).fontWeight || "400",
      fontStyle: window.getComputedStyle(element).fontStyle || "normal",
      textDecoration: window.getComputedStyle(element).textDecoration || "none",
      textAlign: window.getComputedStyle(element).textAlign || "left",
      color: window.getComputedStyle(element).color || "rgb(0, 0, 0)",
      backgroundColor:
        window.getComputedStyle(element).backgroundColor || "transparent",
    },
  };
}

describe("FloatingToolbar", () => {
  afterEach(() => {
    cleanupDom();
    vi.restoreAllMocks();
  });

  it("applies formatting to the controller's current active element", async () => {
    const staleElement = document.createElement("p");
    staleElement.textContent = "stale";
    document.body.appendChild(staleElement);

    const activeElement = document.createElement("p");
    activeElement.textContent = "active";
    document.body.appendChild(activeElement);

    const controller = {
      getActiveElement: vi.fn(() => activeElement),
      notifySelectionUpdate: vi.fn(),
    } as const;

    render(
      <FloatingToolbar
        selection={createSelection(staleElement)}
        controller={controller as never}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector("[data-floating-toolbar]")).not.toBeNull();
    });

    const boldButton = document.querySelector(
      'button[title="Bold"]',
    ) as HTMLButtonElement | null;
    expect(boldButton).not.toBeNull();

    act(() => {
      boldButton?.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
      boldButton?.dispatchEvent(
        new window.PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
    });

    expect(activeElement.style.fontWeight).toBe("700");
    expect(staleElement.style.fontWeight).toBe("");
    expect(controller.notifySelectionUpdate).toHaveBeenCalledTimes(1);
  });

  it("stops pointerdown from bubbling through the React tree", async () => {
    const activeElement = document.createElement("p");
    activeElement.textContent = "active";
    document.body.appendChild(activeElement);

    const parentPointerDown = vi.fn();
    const controller = {
      getActiveElement: vi.fn(() => activeElement),
      notifySelectionUpdate: vi.fn(),
    } as const;

    render(
      <div onPointerDown={parentPointerDown}>
        <FloatingToolbar
          selection={createSelection(activeElement)}
          controller={controller as never}
        />
      </div>,
    );

    await waitFor(() => {
      expect(document.querySelector("[data-floating-toolbar]")).not.toBeNull();
    });

    const boldButton = document.querySelector(
      'button[title="Bold"]',
    ) as HTMLButtonElement | null;
    expect(boldButton).not.toBeNull();

    act(() => {
      boldButton?.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
    });

    expect(parentPointerDown).not.toHaveBeenCalled();
  });

  it('fires the "Edit with AI" action from the portal toolbar', async () => {
    const activeElement = document.createElement("p");
    activeElement.textContent = "active";
    document.body.appendChild(activeElement);

    const onEditWithAi = vi.fn();
    const controller = {
      getActiveElement: vi.fn(() => activeElement),
      notifySelectionUpdate: vi.fn(),
    } as const;

    render(
      <FloatingToolbar
        selection={createSelection(activeElement)}
        controller={controller as never}
        onEditWithAi={onEditWithAi}
      />,
    );

    await waitFor(() => {
      expect(
        document.querySelector('button[title="Edit with AI"]'),
      ).not.toBeNull();
    });

    const sparklesButton = document.querySelector(
      'button[title="Edit with AI"]',
    ) as HTMLButtonElement | null;

    act(() => {
      sparklesButton?.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
      sparklesButton?.dispatchEvent(
        new window.PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
    });

    expect(onEditWithAi).toHaveBeenCalledTimes(1);
  });
});
