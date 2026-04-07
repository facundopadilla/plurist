import { beforeEach, describe, expect, it, vi } from "vitest";

import { SourceDetailModal } from "../features/design-bank/source-detail-modal";
import { cleanupDom, renderWithQuery, typeIn, waitFor } from "./test-dom";

const { patchSource, updateSourceContent } = vi.hoisted(() => ({
  patchSource: vi.fn(),
  updateSourceContent: vi.fn(),
}));

vi.mock("../features/design-bank/api", () => ({
  patchSource,
  updateSourceContent,
  getSourceFileUrl: (id: number) => `/api/v1/design-bank/sources/${id}/file`,
}));

describe("SourceDetailModal managed artifacts", () => {
  beforeEach(() => {
    cleanupDom();
    patchSource.mockReset();
    updateSourceContent.mockReset();
    patchSource.mockResolvedValue({});
  });

  it("persists editable design system content in resource_data without storage_key", async () => {
    renderWithQuery(
      <SourceDetailModal
        open
        source={{
          id: 10,
          source_type: "design_system",
          name: "Project Design System",
          original_filename: "",
          storage_key: "",
          url: "",
          status: "ready",
          extracted_data: {},
          resource_data: {
            artifact_kind: "design_system",
            content: "# Old content",
            edited_after_generation: false,
          },
          error_message: "",
          project_id: 7,
          file_size_bytes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    );

    const editButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Edit"),
    ) as HTMLButtonElement | undefined;
    expect(editButton).toBeDefined();
    editButton?.click();

    let editor: HTMLTextAreaElement | null = null;
    await waitFor(() => {
      editor = document.querySelector("textarea") as HTMLTextAreaElement | null;
      expect(editor).not.toBeNull();
    });
    expect(editor?.value).toContain("Old content");

    typeIn(editor!, "# New manual content");

    const saveButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Save"),
    ) as HTMLButtonElement | undefined;
    saveButton?.click();

    await waitFor(() => {
      expect(patchSource).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          resource_data: expect.objectContaining({
            artifact_kind: "design_system",
            content: "# New manual content",
            edited_after_generation: true,
          }),
        }),
      );
    });

    expect(updateSourceContent).not.toHaveBeenCalled();
  });
});
