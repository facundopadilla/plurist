import { afterEach, describe, expect, it } from "vitest";

import { TestimonialsSection } from "../features/landing/components/testimonials-section";
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

  it("renders the testimonial section copy", () => {
    render(<TestimonialsSection />);

    expect(textExists("Social proof")).toBe(true);
    expect(textExists("Teams that")).toBe(true);
    expect(textExists("ship faster.")).toBe(true);
    expect(textExists("Sofia Reyes")).toBe(true);
    expect(textExists("Marcus Chen")).toBe(true);
    expect(textExists("Ana Volkov")).toBe(true);
  });
});
