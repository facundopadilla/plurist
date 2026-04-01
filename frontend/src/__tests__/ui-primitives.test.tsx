import { afterEach, describe, expect, it } from "vitest";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";
import { cleanupDom, render, textExists, waitFor } from "./test-dom";

describe("shared ui primitives", () => {
  afterEach(() => {
    cleanupDom();
  });

  it("renders Button asChild with shared button styles", () => {
    render(
      <Button asChild variant="outline" size="sm">
        <a href="/docs">Read docs</a>
      </Button>,
    );

    const link = document.querySelector('a[href="/docs"]');
    expect(link).not.toBeNull();
    expect(link?.className).toContain("inline-flex");
    expect(link?.className).toContain("border");
    expect(link?.textContent).toBe("Read docs");
  });

  it("renders Alert with destructive semantics", () => {
    render(
      <Alert variant="destructive">
        <AlertDescription>Something failed badly.</AlertDescription>
      </Alert>,
    );

    const alert = document.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.className).toContain("text-destructive");
    expect(alert?.textContent).toContain("Something failed badly.");
  });

  it("renders Dialog content through the shared dialog wrapper", async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Delete resource</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(textExists("Delete resource")).toBe(true);
      expect(textExists("This action cannot be undone.")).toBe(true);
      expect(textExists("Close")).toBe(true);
    });
  });
});
