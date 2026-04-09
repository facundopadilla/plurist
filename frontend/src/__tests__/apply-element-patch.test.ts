import { describe, expect, it } from "vitest";

import { applyElementPatch } from "../features/canvas/chat/apply-element-patch";

describe("applyElementPatch", () => {
  it("replaces only the targeted element in an html fragment", () => {
    const html = "<section><h2>Hello!</h2><p>Body text</p></section>";

    const result = applyElementPatch(
      html,
      "section > h2",
      '<h2 style="color: skyblue">replaced</h2>',
    );

    expect(result.applied).toBe(true);
    expect(result.html).toContain('<h2 style="color: skyblue">replaced</h2>');
    expect(result.html).toContain("<p>Body text</p>");
    expect(result.html).not.toContain("<h2>Hello!</h2>");
  });

  it("returns the original html when the selector does not exist", () => {
    const html = "<section><h2>Hello!</h2></section>";

    const result = applyElementPatch(html, "section > p", "<p>New</p>");

    expect(result.applied).toBe(false);
    expect(result.html).toBe(html);
    expect(result.error).toMatch(/Target element not found/);
  });

  it("returns the original html when the selector syntax is invalid", () => {
    const html = "<section><h2>Hello!</h2></section>";

    const result = applyElementPatch(html, "section >> h2", "<h2>New</h2>");

    expect(result.applied).toBe(false);
    expect(result.html).toBe(html);
    expect(result.error).toBeTruthy();
  });
});
