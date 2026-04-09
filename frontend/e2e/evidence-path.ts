import { join } from "node:path";

/** Directory for Sisyphus evidence files (host + Docker `WORKDIR=/app`). */
export const EVIDENCE_DIR = join(process.cwd(), ".sisyphus", "evidence");

export function evidencePath(filename: string): string {
  return join(EVIDENCE_DIR, filename);
}
