import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Send,
  Loader2,
} from "lucide-react";
import { useAuth } from "../auth/use-auth";
import { createPost, submitForApproval } from "./api";
import { startCompare, fetchProviders } from "../generation/api";
import { ComparePanel } from "../generation/compare-panel";
import type { GenerationVariant } from "../generation/types";

const NETWORKS = ["linkedin", "x", "instagram"] as const;
const DEFAULT_PROVIDERS = ["openai", "anthropic", "gemini", "openrouter"];

export function ComposePage() {
  const { isOwner, isEditor } = useAuth();
  const navigate = useNavigate();
  const canCompose = isOwner || isEditor;

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(DEFAULT_PROVIDERS);
  const [compareRunId, setCompareRunId] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<GenerationVariant | null>(null);
  const [, setDraftId] = useState<number | null>(null);

  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  const compareMutation = useMutation({
    mutationFn: () =>
      startCompare({
        brand_profile_version_id: 0, // will be set from active version
        template_key: "social-post-standard",
        campaign_brief: brief,
        target_network: selectedNetworks[0] || "",
        providers: selectedProviders,
      }),
    onSuccess: (run) => setCompareRunId(run.id),
  });

  const createAndSubmitMutation = useMutation({
    mutationFn: async () => {
      const post = await createPost({
        title,
        body_text: selectedVariant?.generated_text ?? "",
        target_networks: selectedNetworks,
      });
      setDraftId(post.id);
      await submitForApproval(post.id);
      return post;
    },
    onSuccess: () => navigate("/review"),
  });

  const toggleNetwork = (n: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  const toggleProvider = (p: string) => {
    setSelectedProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  if (!canCompose) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Only Owners and Editors can compose posts.
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <FileText size={20} />
        Compose Post
      </h1>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <input
          data-testid="post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
        />
      </div>

      {/* Campaign brief */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Campaign Brief</label>
        <textarea
          data-testid="campaign-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe what you want to communicate..."
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
        />
      </div>

      {/* Target networks */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Target Networks</label>
        <div className="flex gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n}
              data-testid={`network-${n}`}
              onClick={() => toggleNetwork(n)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedNetworks.includes(n)
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-accent"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Providers */}
      <div className="space-y-2">
        <label className="text-sm font-medium">AI Providers</label>
        <div className="flex gap-2 flex-wrap">
          {(providers ?? DEFAULT_PROVIDERS.map((k) => ({ key: k, name: k }))).map(
            (p) => {
              const key = typeof p === "string" ? p : p.key;
              return (
                <button
                  key={key}
                  data-testid={`compare-provider-${key}`}
                  onClick={() => toggleProvider(key)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    selectedProviders.includes(key)
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {key}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Run compare */}
      {!compareRunId && (
        <button
          onClick={() => compareMutation.mutate()}
          disabled={compareMutation.isPending || !brief.trim()}
          className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {compareMutation.isPending && <Loader2 className="animate-spin" size={14} />}
          Run Compare
        </button>
      )}

      {/* Compare results */}
      {compareRunId && (
        <ComparePanel
          compareRunId={compareRunId}
          onVariantSelected={setSelectedVariant}
        />
      )}

      {/* Submit for approval */}
      <button
        data-testid="submit-for-approval"
        onClick={() => createAndSubmitMutation.mutate()}
        disabled={
          !selectedVariant ||
          !title.trim() ||
          selectedNetworks.length === 0 ||
          createAndSubmitMutation.isPending
        }
        className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {createAndSubmitMutation.isPending ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <Send size={14} />
        )}
        Submit for Approval
      </button>

      {!selectedVariant && compareRunId && (
        <p className="text-xs text-muted-foreground">
          Select a variant above before submitting for approval.
        </p>
      )}
    </div>
  );
}
