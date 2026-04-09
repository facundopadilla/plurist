import { afterEach, describe, expect, it } from "vitest";

import { HeroSection } from "../features/landing/components/hero-section";
import { cleanupDom, render, textExists } from "./test-dom";

if (!("IntersectionObserver" in window)) {
  class IntersectionObserverMock {
    disconnect() {}
    observe() {}
    unobserve() {}
  }

  globalThis.IntersectionObserver =
    IntersectionObserverMock as unknown as typeof IntersectionObserver;
}

describe("landing page sections", () => {
  afterEach(() => {
    cleanupDom();
  });

  it("renders the hero headline copy", () => {
    render(<HeroSection />);

    expect(textExists("Create content")).toBe(true);
    expect(
      textExists("The open-source alternative to Google Stitch and Banani."),
    ).toBe(true);
  });
});
