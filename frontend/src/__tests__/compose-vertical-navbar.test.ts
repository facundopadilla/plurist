import { beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SidePanel } from "../features/canvas/components/side-panel";
import { VerticalNavbar } from "../features/canvas/components/vertical-navbar";
import {
  selectActivePanel,
  useCanvasStore,
} from "../features/canvas/canvas-store";
import { ResourcesPanel } from "../features/canvas/resources/resources-panel";

describe("compose-vertical-navbar", () => {
  beforeEach(() => {
    useCanvasStore.setState(useCanvasStore.getInitialState());
  });

  describe("canvas-store panel state", () => {
    it("canvas-store module exports useCanvasStore and selectActivePanel", () => {
      expect(typeof useCanvasStore).toBe("function");
      expect(typeof selectActivePanel).toBe("function");
    });

    it("selectActivePanel selector returns activePanel from store state", () => {
      useCanvasStore.setState({ activePanel: "chat" });
      const state = useCanvasStore.getState();
      expect(selectActivePanel(state)).toBe("chat");
    });

    it("default activePanel is 'chat'", () => {
      expect(useCanvasStore.getInitialState().activePanel).toBe("chat");
    });

    it("resetActivePanel restores the default chat panel", () => {
      useCanvasStore.setState({ activePanel: "resources" });
      useCanvasStore.getState().resetActivePanel();
      expect(useCanvasStore.getState().activePanel).toBe("chat");
    });

    it("togglePanel closes panel when same panel toggled", () => {
      useCanvasStore.setState({ activePanel: "chat" });
      useCanvasStore.getState().togglePanel("chat");
      expect(useCanvasStore.getState().activePanel).toBeNull();
    });

    it("togglePanel opens panel when different panel toggled", () => {
      useCanvasStore.setState({ activePanel: "chat" });
      useCanvasStore.getState().togglePanel("resources");
      expect(useCanvasStore.getState().activePanel).toBe("resources");
    });

    it("togglePanel opens panel when activePanel is null", () => {
      useCanvasStore.setState({ activePanel: null });
      useCanvasStore.getState().togglePanel("resources");
      expect(useCanvasStore.getState().activePanel).toBe("resources");
    });
  });

  describe("module exports", () => {
    it("VerticalNavbar module exports the component", () => {
      expect(typeof VerticalNavbar).toBe("function");
    });

    it("SidePanel module exports the component", () => {
      expect(typeof SidePanel).toBe("function");
    });

    it("ResourcesPanel module exports the component", () => {
      expect(typeof ResourcesPanel).toBe("function");
    });
  });

  describe("component output", () => {
    it("VerticalNavbar marks the active tool with aria-pressed", () => {
      useCanvasStore.setState({ activePanel: "resources" });

      const html = renderToStaticMarkup(createElement(VerticalNavbar));

      expect(html).toContain('data-testid="navbar-tool-chat"');
      expect(html).toContain('data-testid="navbar-tool-resources"');
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain('aria-pressed="true"');
    });

    it("SidePanel renders its shell test id", () => {
      const html = renderToStaticMarkup(
        createElement(SidePanel, null, createElement("div", null, "contenido")),
      );

      expect(html).toContain('data-testid="side-panel"');
      expect(html).toContain("contenido");
    });
  });
});
