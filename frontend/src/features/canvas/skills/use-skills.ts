import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCatalog,
  fetchInstalledSkills,
  installSkill,
  uninstallSkill,
  toggleInstalledSkill,
  importSkillFromUrl,
  createCustomSkill,
} from "./api";

// ── Catalog ─────────────────────────────────────────────────────────

export function useCatalog(search = "") {
  return useQuery({
    queryKey: ["skills-catalog", search],
    queryFn: () => fetchCatalog(search),
  });
}

// ── Project installed skills ────────────────────────────────────────

export function useInstalledSkills(projectId: number | null) {
  return useQuery({
    queryKey: ["installed-skills", projectId],
    queryFn: () =>
      projectId ? fetchInstalledSkills(projectId) : Promise.resolve([]),
    enabled: projectId !== null,
  });
}

// ── Mutations ───────────────────────────────────────────────────────

export function useInstallSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: installSkill,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["installed-skills", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["skills-catalog"] });
    },
  });
}

export function useUninstallSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uninstallSkill,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["installed-skills", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["skills-catalog"] });
    },
  });
}

export function useToggleSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleInstalledSkill,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["installed-skills", vars.projectId] });
    },
  });
}

export function useImportSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importSkillFromUrl,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills-catalog"] });
    },
  });
}

export function useCreateCustomSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCustomSkill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills-catalog"] });
    },
  });
}
