import { apiUpload } from "../../../lib/api/client";

interface UploadRenderBlobOptions {
  blob: Blob;
  filename: string;
  draftPostId: number;
}

export interface UploadRenderBlobResponse {
  storage_key: string;
  draft_post_id: number | null;
  content_type: string;
}

export function uploadRenderBlob({
  blob,
  filename,
  draftPostId,
}: UploadRenderBlobOptions) {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("draft_post_id", String(draftPostId));
  return apiUpload<UploadRenderBlobResponse>(
    "/api/v1/rendering/upload-blob",
    formData,
  );
}
