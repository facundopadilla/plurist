import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Plus } from "lucide-react";
import { ElegantModal } from "../../components/ui/elegant-modal";
import { createProject } from "./api";

interface Props {
  onClose: () => void;
}

export function CreateProjectDialog({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      createProject({
        name,
        description,
        tags: tags.map((t) => ({ name: t, color: "#6b7280" })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
  });

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <ElegantModal
      open={true}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="New Project"
      showHeader
      maxWidth="max-w-md"
    >
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Project"
            className="elegant-input w-full"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            rows={2}
            className="elegant-input w-full resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tags</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add tag..."
              className="elegant-input flex-1"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={!tagInput.trim()}
              className="rounded-[14px] border border-border px-2.5 py-2.5 text-sm transition-colors hover:bg-accent disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-foreground"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-500">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to create project"}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-[14px] border border-border px-4 py-2.5 text-sm transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-[14px] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Create Project
          </button>
        </div>
      </div>
    </ElegantModal>
  );
}
