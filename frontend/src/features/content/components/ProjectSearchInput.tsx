import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FolderOpen, Check } from "lucide-react";
import { cn } from "../../../lib/utils";
import { fetchProjects } from "../../projects/api";
import type { Project } from "../../projects/types";

interface ProjectSearchInputProps {
  value: number | null;
  onChange: (id: number | null) => void;
}

export function ProjectSearchInput({
  value,
  onChange,
}: Readonly<ProjectSearchInputProps>) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const filtered = debouncedQuery.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
      )
    : projects;

  const selectedProject = projects.find((p) => p.id === value) ?? null;

  const handleSelect = useCallback(
    (id: number | null) => {
      onChange(id);
      setOpen(false);
      setQuery("");
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <label htmlFor="project-search-input" className="text-sm font-medium">
        Project{" "}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          (optional)
        </span>
      </label>

      {/* Selected project display */}
      {selectedProject && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedProject.color ?? "#6366f1" }}
          />
          <span className="font-medium text-foreground">
            using Design Bank from {selectedProject.name}
          </span>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          id="project-search-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            selectedProject ? selectedProject.name : "Search project..."
          }
          className="w-full pl-8 pr-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      {/* Dropdown results */}
      {open && (
        <div className="border border-border rounded-md bg-background shadow-md max-h-48 overflow-y-auto">
          {/* No project option */}
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left",
              value === null && "bg-accent",
            )}
          >
            <FolderOpen
              size={14}
              className="text-muted-foreground flex-shrink-0"
            />
            <span className="flex-1">No project</span>
            {value === null && <Check size={14} className="text-foreground" />}
          </button>

          {filtered.map((project) => (
            <ProjectOption
              key={project.id}
              project={project}
              isSelected={value === project.id}
              onSelect={() => handleSelect(project.id)}
            />
          ))}

          {filtered.length === 0 && debouncedQuery && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No projects found
            </p>
          )}
        </div>
      )}

      {/* Close dropdown on outside click */}
      {open && (
        <button
          type="button"
          aria-label="Close project search"
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ProjectOption({
  project,
  isSelected,
  onSelect,
}: Readonly<{
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left",
        isSelected && "bg-accent",
      )}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: project.color ?? "#6366f1" }}
      />

      {/* Icon if exists */}
      {project.icon_url ? (
        <img
          src={project.icon_url}
          alt={project.name}
          className="w-4 h-4 rounded object-cover flex-shrink-0"
        />
      ) : (
        <FolderOpen size={14} className="text-muted-foreground flex-shrink-0" />
      )}

      <span className="flex-1 font-medium">{project.name}</span>

      {isSelected && (
        <Check size={14} className="text-foreground flex-shrink-0" />
      )}
    </button>
  );
}
