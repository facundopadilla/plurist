import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Upload,
  Globe,
  Palette,
  Type,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  uploadFile,
  ingestUrl,
  createColorResource,
  createFontResource,
  createTextResource,
} from "./api";
import {
  DESIGN_BANK_INPUT_CLASSNAME,
  UploadResourceField,
} from "./resource-ui";
import type { Project } from "../projects/types";

type AddTab = "upload" | "url" | "color" | "font" | "text";

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  projects: Project[];
  projectId?: number | null;
}

export function AddResourceModal({
  open,
  onClose,
  onAdded,
  projects,
  projectId: initialProjectId,
}: Readonly<AddResourceModalProps>) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<AddTab>("upload");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    initialProjectId ?? null,
  );
  const [urlValue, setUrlValue] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [colorRole, setColorRole] = useState("");
  const [fontName, setFontName] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textKind, setTextKind] = useState("copy");
  const [fileError, setFileError] = useState<string | null>(null);

  const invalidate = (pid: number | null) => {
    void queryClient.invalidateQueries({ queryKey: ["design-bank-sources"] });
    if (pid != null) {
      void queryClient.invalidateQueries({
        queryKey: ["project-sources", pid],
      });
    }
  };

  const fileMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFile(file, selectedProjectId ?? undefined),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onAdded();
    },
    onError: (err: Error) => setFileError(err.message),
  });

  const urlMutation = useMutation({
    mutationFn: () => ingestUrl(urlValue, selectedProjectId ?? undefined),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setUrlValue("");
      onAdded();
    },
  });

  const colorMutation = useMutation({
    mutationFn: () =>
      createColorResource({
        name: colorName,
        hex: colorHex,
        role: colorRole,
        project_id: selectedProjectId,
      }),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setColorName("");
      setColorRole("");
      onAdded();
    },
  });

  const fontMutation = useMutation({
    mutationFn: () =>
      createFontResource({
        name: fontName,
        family: fontFamily,
        project_id: selectedProjectId,
      }),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setFontName("");
      setFontFamily("");
      onAdded();
    },
  });

  const textMutation = useMutation({
    mutationFn: () =>
      createTextResource({
        name: textName,
        content: textContent,
        kind: textKind,
        project_id: selectedProjectId,
      }),
    onSuccess: () => {
      invalidate(selectedProjectId);
      setTextName("");
      setTextContent("");
      onAdded();
    },
  });

  if (!open) return null;

  const showProjectSelector = initialProjectId == null;

  const tabs: { key: AddTab; label: string; icon: React.ReactNode }[] = [
    { key: "upload", label: "Upload", icon: <Upload size={13} /> },
    { key: "url", label: "URL", icon: <Globe size={13} /> },
    { key: "color", label: "Color", icon: <Palette size={13} /> },
    { key: "font", label: "Font", icon: <Type size={13} /> },
    { key: "text", label: "Text", icon: <FileText size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <button
        type="button"
        aria-label="Close add resource modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800/70 bg-zinc-950/95 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-[-0.02em] text-zinc-50">
            Add resource
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Project selector */}
        {showProjectSelector && projects.length > 0 && (
          <div className="px-5 pt-4">
            <label
              htmlFor="add-resource-project"
              className="mb-1 block text-xs font-medium text-zinc-500"
            >
              Project (optional)
            </label>
            <select
              id="add-resource-project"
              value={selectedProjectId ?? ""}
              onChange={(e) =>
                setSelectedProjectId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className={DESIGN_BANK_INPUT_CLASSNAME}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div
          className={cn(
            "flex border-b border-zinc-800/60",
            showProjectSelector && projects.length > 0 ? "mt-4" : "mt-0",
          )}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                activeTab === t.key
                  ? "-mb-px border-b-2 border-zinc-50 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-100",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "upload" && (
            <UploadResourceField
              fileInputRef={fileInputRef}
              isPending={fileMutation.isPending}
              onFileSelect={(file) => fileMutation.mutate(file)}
              errorMessage={fileError}
              successMessage={
                fileMutation.isSuccess ? "File uploaded successfully." : null
              }
            />
          )}

          {activeTab === "url" && (
            <div className="flex gap-2">
              <Input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://..."
                className={DESIGN_BANK_INPUT_CLASSNAME}
              />
              <Button
                onClick={() => urlMutation.mutate()}
                disabled={urlMutation.isPending || !urlValue.trim()}
              >
                {urlMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Add
              </Button>
            </div>
          )}

          {activeTab === "color" && (
            <div className="flex flex-wrap gap-2">
              <Input
                type="text"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="Name (e.g. Primary)"
                className={`${DESIGN_BANK_INPUT_CLASSNAME} min-w-[120px] flex-1`}
              />
              <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800/70 bg-zinc-950/80 px-2 py-1">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                />
                <span className="font-mono text-xs text-zinc-500">
                  {colorHex}
                </span>
              </div>
              <Input
                type="text"
                value={colorRole}
                onChange={(e) => setColorRole(e.target.value)}
                placeholder="Role (optional)"
                className={`${DESIGN_BANK_INPUT_CLASSNAME} w-28`}
              />
              <Button
                onClick={() => colorMutation.mutate()}
                disabled={colorMutation.isPending || !colorName.trim()}
              >
                {colorMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Add
              </Button>
            </div>
          )}

          {activeTab === "font" && (
            <div className="flex flex-wrap gap-2">
              <Input
                type="text"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                placeholder="Name (e.g. Display font)"
                className={`${DESIGN_BANK_INPUT_CLASSNAME} min-w-[140px] flex-1`}
              />
              <Input
                type="text"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                placeholder="Family (e.g. Inter)"
                className={`${DESIGN_BANK_INPUT_CLASSNAME} min-w-[120px] flex-1`}
              />
              <Button
                onClick={() => fontMutation.mutate()}
                disabled={
                  fontMutation.isPending ||
                  !fontName.trim() ||
                  !fontFamily.trim()
                }
              >
                {fontMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Add
              </Button>
            </div>
          )}

          {activeTab === "text" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={textName}
                  onChange={(e) => setTextName(e.target.value)}
                  placeholder="Name (e.g. Tagline)"
                  className={`${DESIGN_BANK_INPUT_CLASSNAME} flex-1`}
                />
                <select
                  value={textKind}
                  onChange={(e) => setTextKind(e.target.value)}
                  className={DESIGN_BANK_INPUT_CLASSNAME}
                >
                  <option value="copy">Copy</option>
                  <option value="tagline">Tagline</option>
                  <option value="slogan">Slogan</option>
                  <option value="voice_notes">Voice notes</option>
                </select>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Write your brand copy here..."
                  rows={3}
                  className={`${DESIGN_BANK_INPUT_CLASSNAME} flex-1 resize-none`}
                />
                <Button
                  onClick={() => textMutation.mutate()}
                  disabled={
                    textMutation.isPending ||
                    !textName.trim() ||
                    !textContent.trim()
                  }
                  className="self-end"
                >
                  {textMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Plus size={13} />
                  )}
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
