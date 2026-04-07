import { useState, useMemo } from "react";
import { useCanvasStore } from "../canvas-store";
import {
  useCatalog,
  useInstalledSkills,
  useInstallSkill,
  useUninstallSkill,
  useToggleSkill,
  useImportSkill,
  useCreateCustomSkill,
} from "./use-skills";
import type { SkillBrief, ProjectSkill } from "./api";
import * as Icons from "lucide-react";
import { cn } from "../../../lib/utils";

// ── Helpers ─────────────────────────────────────────────────────────

function DynamicIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon =
    (Icons as unknown as Record<string, React.ElementType>)[name] ||
    Icons.Code2;
  return <Icon className={className} />;
}

type Tab = "installed" | "catalog" | "import";

// ── Main panel ──────────────────────────────────────────────────────

export function SkillsPanel() {
  const projectId = useCanvasStore((s) => s.config.projectId);
  const [activeTab, setActiveTab] = useState<Tab>("installed");
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-4 py-4">
        <h3 className="text-sm font-semibold tracking-[-0.02em] text-zinc-50">
          Skills Marketplace
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          Install, create, and manage AI skills for this project.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-800/60 px-2">
        {(
          [
            { id: "installed", label: "Installed" },
            { id: "catalog", label: "Browse" },
            { id: "import", label: "Add" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "relative px-3 py-2.5 text-xs font-medium transition-colors",
              activeTab === id
                ? "text-zinc-50"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {label}
            {activeTab === id && (
              <span className="absolute bottom-0 left-1 right-1 h-px bg-indigo-500" />
            )}
          </button>
        ))}
      </div>

      {/* Search (catalog only) */}
      {activeTab === "catalog" && (
        <div className="border-b border-zinc-800/60 px-4 py-2.5">
          <div className="relative">
            <Icons.Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills…"
              className="h-8 w-full rounded-md border border-zinc-800/60 bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-700 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!projectId ? (
          <EmptyNotice
            icon="FolderOpen"
            message="Select a project to manage skills."
            hint="Use the project dropdown in the top header to pick one."
          />
        ) : activeTab === "installed" ? (
          <InstalledSection projectId={projectId} />
        ) : activeTab === "catalog" ? (
          <CatalogSection projectId={projectId} search={search} />
        ) : (
          <ImportSection projectId={projectId} />
        )}
      </div>
    </div>
  );
}

// ── Installed Section ───────────────────────────────────────────────

function InstalledSection({ projectId }: { projectId: number }) {
  const { data: installed = [], isLoading } = useInstalledSkills(projectId);
  const { mutate: toggleSkill, isPending: isToggling } = useToggleSkill();
  const { mutate: uninstall, isPending: isUninstalling } = useUninstallSkill();

  if (isLoading) return <LoadingSpinner />;

  if (installed.length === 0) {
    return (
      <EmptyNotice
        icon="Package"
        message="No skills installed yet."
        hint="Browse the catalog to find skills for your project."
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-3">
      {installed.map((ps: ProjectSkill) => (
        <div
          key={ps.id}
          className="group flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-900/30 p-3 transition-colors hover:border-zinc-700/50"
        >
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
              ps.is_active
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                : "border-zinc-800 bg-zinc-950 text-zinc-600",
            )}
          >
            <DynamicIcon name={ps.skill.icon || "Code2"} className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-[13px] font-medium text-zinc-200">
                {ps.skill.name}
              </h4>
              <SourceBadge source={ps.skill.source} />
            </div>
            {ps.skill.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                {ps.skill.description}
              </p>
            )}

            {/* Actions */}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => toggleSkill({ projectId, skillId: ps.skill.id })}
                disabled={isToggling}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  ps.is_active
                    ? "bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25"
                    : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                )}
              >
                {ps.is_active ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => uninstall({ projectId, skillId: ps.skill.id })}
                disabled={isUninstalling}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Catalog Section ─────────────────────────────────────────────────

function CatalogSection({
  projectId,
  search,
}: {
  projectId: number;
  search: string;
}) {
  const { data: catalog = [], isLoading: loadingCatalog } = useCatalog(search);
  const { data: installed = [] } = useInstalledSkills(projectId);
  const { mutate: install, isPending: isInstalling } = useInstallSkill();

  const installedIds = useMemo(
    () => new Set(installed.map((ps: ProjectSkill) => ps.skill.id)),
    [installed],
  );

  if (loadingCatalog) return <LoadingSpinner />;

  if (catalog.length === 0) {
    return (
      <EmptyNotice
        icon="SearchX"
        message={
          search
            ? "No skills match your search."
            : "The catalog is empty. Import some skills first."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-3">
      {catalog.map((skill: SkillBrief) => {
        const alreadyInstalled = installedIds.has(skill.id);
        return (
          <div
            key={skill.id}
            className="group flex items-start gap-3 rounded-lg border border-zinc-800/40 bg-zinc-900/30 p-3 transition-colors hover:border-zinc-700/50"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 transition-colors group-hover:text-zinc-400">
              <DynamicIcon name={skill.icon || "Code2"} className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-[13px] font-medium text-zinc-200">
                  {skill.name}
                </h4>
                <SourceBadge source={skill.source} />
              </div>
              {skill.author && (
                <p className="mt-0.5 text-[11px] text-zinc-600">
                  {skill.author}
                </p>
              )}
              {skill.description && (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                  {skill.description}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2">
                {alreadyInstalled ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <Icons.Check className="h-3 w-3" />
                    Installed
                  </span>
                ) : (
                  <button
                    onClick={() => install({ projectId, skillId: skill.id })}
                    disabled={isInstalling}
                    className="flex items-center gap-1 rounded-md bg-indigo-500/15 px-2.5 py-1 text-[11px] font-medium text-indigo-300 transition-colors hover:bg-indigo-500/25 disabled:opacity-50"
                  >
                    <Icons.Plus className="h-3 w-3" />
                    Install
                  </button>
                )}
                {skill.install_count > 0 && (
                  <span className="text-[10px] text-zinc-600">
                    {skill.install_count}{" "}
                    {skill.install_count === 1 ? "install" : "installs"}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Import / Create Section ─────────────────────────────────────────

function ImportSection({ projectId }: { projectId: number }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <ImportFromUrl projectId={projectId} />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800/60" />
        <span className="text-[10px] text-zinc-600">or</span>
        <div className="h-px flex-1 bg-zinc-800/60" />
      </div>
      <CreateCustom projectId={projectId} />
    </div>
  );
}

function ImportFromUrl({ projectId }: { projectId: number }) {
  const [url, setUrl] = useState("");
  const {
    mutate: importSkill,
    isPending,
    error,
    isSuccess,
    reset,
  } = useImportSkill();
  const { mutate: install } = useInstallSkill();

  const handleImport = () => {
    if (!url.trim()) return;
    reset();
    importSkill(url.trim(), {
      onSuccess: (skill) => {
        // Auto-install into current project
        install({ projectId, skillId: skill.id });
        setUrl("");
      },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icons.Link className="h-3.5 w-3.5 text-zinc-500" />
        <h4 className="text-xs font-medium text-zinc-300">Import from URL</h4>
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Paste a GitHub repo or skills.sh URL containing a SKILL.md file.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleImport()}
          placeholder="https://github.com/owner/repo"
          className="h-8 flex-1 rounded-md border border-zinc-800/60 bg-zinc-900/60 px-3 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-zinc-700 focus:ring-1 focus:ring-indigo-500/30"
        />
        <button
          onClick={handleImport}
          disabled={isPending || !url.trim()}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-indigo-500/15 px-3 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/25 disabled:opacity-50"
        >
          {isPending ? (
            <Icons.Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Icons.Download className="h-3 w-3" />
          )}
          Import
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-400">
          {(error as Error).message || "Failed to import skill."}
        </p>
      )}
      {isSuccess && (
        <p className="text-[11px] text-emerald-400">
          Skill imported and installed!
        </p>
      )}
    </div>
  );
}

function CreateCustom({ projectId }: { projectId: number }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  const {
    mutate: create,
    isPending,
    error,
    isSuccess,
    reset,
  } = useCreateCustomSkill();
  const { mutate: install } = useInstallSkill();

  const handleCreate = () => {
    if (!name.trim() || !content.trim()) return;
    reset();
    create(
      { name: name.trim(), content: content.trim() },
      {
        onSuccess: (skill) => {
          install({ projectId, skillId: skill.id });
          setName("");
          setContent("");
          setOpen(false);
        },
      },
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-800/60 p-3 text-xs text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
      >
        <Icons.Plus className="h-3.5 w-3.5" />
        Create a custom skill
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icons.Sparkles className="h-3.5 w-3.5 text-zinc-500" />
          <h4 className="text-xs font-medium text-zinc-300">
            Create custom skill
          </h4>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded p-1 text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <Icons.X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Skill name"
        className="h-8 w-full rounded-md border border-zinc-800/60 bg-zinc-900/60 px-3 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-zinc-700 focus:ring-1 focus:ring-indigo-500/30"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your skill instructions in markdown…"
        rows={6}
        className="w-full resize-none rounded-md border border-zinc-800/60 bg-zinc-900/60 p-3 text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-zinc-700 focus:ring-1 focus:ring-indigo-500/30"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleCreate}
          disabled={isPending || !name.trim() || !content.trim()}
          className="flex items-center gap-1.5 rounded-md bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/25 disabled:opacity-50"
        >
          {isPending ? (
            <Icons.Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Icons.Check className="h-3 w-3" />
          )}
          Create & Install
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-400">
          {(error as Error).message || "Failed to create skill."}
        </p>
      )}
      {isSuccess && (
        <p className="text-[11px] text-emerald-400">
          Skill created and installed!
        </p>
      )}
    </div>
  );
}

// ── Shared components ───────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const config: Record<string, { label: string; className: string }> = {
    catalog: {
      label: "Catalog",
      className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    github: {
      label: "GitHub",
      className: "bg-zinc-800/60 text-zinc-400 border-zinc-700/40",
    },
    custom: {
      label: "Custom",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  };

  const c = config[source] || config.catalog;
  return (
    <span
      className={cn(
        "shrink-0 rounded border px-1.5 py-px text-[9px] font-medium leading-tight",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-50" />
    </div>
  );
}

function EmptyNotice({
  icon,
  message,
  hint,
}: {
  icon: string;
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 px-6">
      <DynamicIcon name={icon} className="h-6 w-6 text-zinc-700" />
      <p className="text-center text-xs text-zinc-500">{message}</p>
      {hint && <p className="text-center text-[11px] text-zinc-600">{hint}</p>}
    </div>
  );
}
