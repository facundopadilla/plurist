import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../auth/use-auth";
import { createContent, completeContent } from "./api";
import { startCompare, fetchProviders } from "../generation/api";
import { ComparePanel } from "../generation/compare-panel";
import {
  ProjectSearchInput,
  FormatSelector,
  SlideCountInput,
  ProviderCard,
} from "./components";
import type { GenerationVariant } from "../generation/types";

const DEFAULT_PROVIDERS = ["openai", "anthropic", "gemini", "openrouter"];

export function ComposePage() {
  const { isOwner, isEditor } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultProjectId = searchParams.get("project")
    ? Number(searchParams.get("project"))
    : null;

  const canCompose = isOwner || isEditor;

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    defaultProjectId,
  );
  const [formatKey, setFormatKey] = useState("ig_square");
  const [formatWidth, setFormatWidth] = useState(1080);
  const [formatHeight, setFormatHeight] = useState(1080);
  const [slideCount, setSlideCount] = useState<number | null>(null);
  const [selectedProviders, setSelectedProviders] =
    useState<string[]>(DEFAULT_PROVIDERS);
  const [compareRunId, setCompareRunId] = useState<number | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<
    Record<number, GenerationVariant>
  >({});

  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  const compareMutation = useMutation({
    mutationFn: () =>
      startCompare({
        campaign_brief: brief,
        target_network: "",
        providers: selectedProviders,
        project_id: selectedProjectId,
        format: formatKey,
        slide_count: slideCount,
        width: formatWidth,
        height: formatHeight,
      }),
    onSuccess: (run) => {
      setCompareRunId(run.id);
      setSelectedVariants({});
    },
  });

  const createAndCompleteMutation = useMutation({
    mutationFn: async () => {
      const primaryVariant = selectedVariants[0];
      const htmlContent = primaryVariant?.generated_html ?? "";
      const bodyText = primaryVariant?.generated_text ?? "";

      const post = await createContent({
        title,
        body_text: bodyText,
        project_id: selectedProjectId,
        format: formatKey,
        html_content: htmlContent,
      });
      await completeContent(post.id);
      return post;
    },
    onSuccess: () => navigate("/content"),
  });

  const toggleProvider = (p: string) => {
    setSelectedProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleVariantSelected = (
    variant: GenerationVariant,
    slideIdx: number,
  ) => {
    setSelectedVariants((prev) => ({ ...prev, [slideIdx]: variant }));
  };

  const hasAnyVariantSelected = Object.keys(selectedVariants).length > 0;

  if (!canCompose) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Only Owners and Editors can create content.
      </div>
    );
  }

  return (
    <div className="max-w-4xl animate-page-in space-y-6">
      <h1 className="flex items-center gap-2 text-[24px] font-semibold tracking-[-0.03em]">
        <FileText size={20} />
        New content
      </h1>

      <div className="space-y-2">
        <label htmlFor="compose-title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="compose-title"
          data-testid="post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Content title..."
          className="w-full"
        />
      </div>

      <ProjectSearchInput
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      />

      <FormatSelector
        formatKey={formatKey}
        onFormatChange={(key, w, h) => {
          setFormatKey(key);
          setFormatWidth(w);
          setFormatHeight(h);
        }}
      />

      <SlideCountInput value={slideCount} onChange={setSlideCount} />

      <div className="space-y-2">
        <label htmlFor="compose-campaign-brief" className="text-sm font-medium">
          Campaign brief
        </label>
        <textarea
          id="compose-campaign-brief"
          data-testid="campaign-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe what you want to communicate..."
          rows={4}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">AI providers</p>
        <div className="flex flex-wrap gap-2">
          {(providers ?? DEFAULT_PROVIDERS).map((k) => (
            <ProviderCard
              key={k}
              providerKey={k}
              name={k}
              selected={selectedProviders.includes(k)}
              onToggle={() => toggleProvider(k)}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={() => compareMutation.mutate()}
        disabled={
          compareMutation.isPending ||
          !brief.trim() ||
          selectedProviders.length === 0
        }
      >
        {compareMutation.isPending && (
          <Loader2 className="animate-spin" size={14} />
        )}
        {compareRunId ? "Regenerate" : "Generate design"}
      </Button>

      {compareMutation.isError && (
        <p className="text-xs text-destructive">
          {compareMutation.error instanceof Error
            ? compareMutation.error.message
            : "Error generating"}
        </p>
      )}

      {compareRunId && (
        <ComparePanel
          compareRunId={compareRunId}
          width={formatWidth}
          height={formatHeight}
          onVariantSelected={handleVariantSelected}
        />
      )}

      <Button
        data-testid="complete-content"
        onClick={() => createAndCompleteMutation.mutate()}
        disabled={
          !hasAnyVariantSelected ||
          !title.trim() ||
          createAndCompleteMutation.isPending
        }
      >
        {createAndCompleteMutation.isPending ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <CheckCircle size={14} />
        )}
        Create & complete
      </Button>

      {createAndCompleteMutation.isError && (
        <p className="text-xs text-destructive">
          {createAndCompleteMutation.error instanceof Error
            ? createAndCompleteMutation.error.message
            : "Error creating content"}
        </p>
      )}

      {!hasAnyVariantSelected && compareRunId && (
        <p className="text-xs text-muted-foreground">
          Select at least one variant before completing.
        </p>
      )}
    </div>
  );
}
