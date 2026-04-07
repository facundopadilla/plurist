import { apiRequest } from "../../../lib/api/client";

// ── Types ───────────────────────────────────────────────────────────

/** Full skill from the catalog (includes content) */
export interface Skill {
  id: number;
  name: string;
  slug: string;
  description: string;
  content: string;
  icon: string;
  source: "catalog" | "github" | "custom";
  source_url: string;
  author: string;
  install_count: number;
  created_at: string;
}

/** Lightweight skill for marketplace listings (no content) */
export interface SkillBrief {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  source: "catalog" | "github" | "custom";
  source_url: string;
  author: string;
  install_count: number;
}

/** Skill installed in a project */
export interface ProjectSkill {
  id: number;
  project_id: number;
  skill: Skill;
  is_active: boolean;
  created_at: string;
}

export interface ToggleResult {
  id: number;
  is_active: boolean;
  skill_id: number;
  project_id: number;
}

// ── Catalog endpoints ───────────────────────────────────────────────

export async function fetchCatalog(search = ""): Promise<SkillBrief[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest<SkillBrief[]>(`/api/v1/skills/catalog/${params}`);
}

export async function fetchSkillDetail(skillId: number): Promise<Skill> {
  return apiRequest<Skill>(`/api/v1/skills/catalog/${skillId}/`);
}

// ── Project installed skills ────────────────────────────────────────

export async function fetchInstalledSkills(
  projectId: number,
): Promise<ProjectSkill[]> {
  return apiRequest<ProjectSkill[]>(`/api/v1/skills/project/${projectId}/`);
}

export async function installSkill(params: {
  projectId: number;
  skillId: number;
}): Promise<ProjectSkill> {
  return apiRequest<ProjectSkill>(
    `/api/v1/skills/project/${params.projectId}/install/${params.skillId}/`,
    { method: "POST" },
  );
}

export async function uninstallSkill(params: {
  projectId: number;
  skillId: number;
}): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/api/v1/skills/project/${params.projectId}/uninstall/${params.skillId}/`,
    { method: "POST" },
  );
}

export async function toggleInstalledSkill(params: {
  projectId: number;
  skillId: number;
}): Promise<ToggleResult> {
  return apiRequest<ToggleResult>(
    `/api/v1/skills/project/${params.projectId}/toggle/${params.skillId}/`,
    { method: "POST" },
  );
}

// ── Import & create ─────────────────────────────────────────────────

export async function importSkillFromUrl(url: string): Promise<Skill> {
  return apiRequest<Skill>("/api/v1/skills/import/", {
    method: "POST",
    body: { url },
  });
}

export async function createCustomSkill(payload: {
  name: string;
  description?: string;
  content: string;
  icon?: string;
}): Promise<Skill> {
  return apiRequest<Skill>("/api/v1/skills/custom/", {
    method: "POST",
    body: payload,
  });
}
