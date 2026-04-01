import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../auth/use-auth";
import { createContent, submitContentForApproval } from "./api";
import { startCompare, fetchProviders } from "../generation/api";
import { ComparePanel } from "../generation/compare-panel";
import {
  ProjectSearchInput,
  NetworkFormatSelector,
  SlideCountInput,
  ProviderCard,
} from "./components";
import type { GenerationVariant } from "../generation/types";

const DEFAULT_PROVIDERS = ["openai", "anthropic", "gemini", "openrouter"];

type NetworkId = "instagram" | "linkedin" | "x";

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
  const [network, setNetwork] = useState<NetworkId | null>(null);
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
        target_network: network ?? "",
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

  const createAndSubmitMutation = useMutation({
    mutationFn: async () => {
      const primaryVariant = selectedVariants[0];
      const htmlContent = primaryVariant?.generated_html ?? "";
      const bodyText = primaryVariant?.generated_text ?? "";

      const post = await createContent({
        title,
        body_text: bodyText,
        target_networks: network ? [network] : [],
        project_id: selectedProjectId,
        format: formatKey,
        html_content: htmlContent,
      });
      await submitContentForApproval(post.id);
      return post;
    },
    onSuccess: () => navigate("/contenido"),
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
        Solo Owners y Editors pueden crear contenido.
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 animate-page-in">
      <h1 className="text-[24px] font-semibold tracking-[-0.03em] flex items-center gap-2">
        <FileText size={20} />
        Nuevo contenido
      </h1>

      {/* Título */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Título</label>
        <Input
          data-testid="post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del contenido..."
          className="w-full"
        />
      </div>

      {/* Selector de proyecto */}
      <ProjectSearchInput
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      />

      {/* Selector de red + formato */}
      <NetworkFormatSelector
        formatKey={formatKey}
        network={network}
        onFormatChange={(key, w, h) => {
          setFormatKey(key);
          setFormatWidth(w);
          setFormatHeight(h);
        }}
        onNetworkChange={(n) => {
          setNetwork(n);
          // Reset format to first available when network changes
          setFormatKey("");
        }}
      />

      {/* Cantidad de slides */}
      <SlideCountInput value={slideCount} onChange={setSlideCount} />

      {/* Brief */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Brief de campaña</label>
        <textarea
          data-testid="campaign-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe qué querés comunicar..."
          rows={4}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Proveedores de IA */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Proveedores de IA</label>
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

      {/* Generar */}
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
        {compareRunId ? "Regenerar" : "Generar diseño"}
      </Button>

      {compareMutation.isError && (
        <p className="text-xs text-destructive">
          {compareMutation.error instanceof Error
            ? compareMutation.error.message
            : "Error al generar"}
        </p>
      )}

      {/* Resultados del compare */}
      {compareRunId && (
        <ComparePanel
          compareRunId={compareRunId}
          width={formatWidth}
          height={formatHeight}
          onVariantSelected={handleVariantSelected}
        />
      )}

      {/* Enviar para aprobación */}
      <Button
        data-testid="submit-for-approval"
        onClick={() => createAndSubmitMutation.mutate()}
        disabled={
          !hasAnyVariantSelected ||
          !title.trim() ||
          !network ||
          createAndSubmitMutation.isPending
        }
      >
        {createAndSubmitMutation.isPending ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <Send size={14} />
        )}
        Enviar para aprobación
      </Button>

      {createAndSubmitMutation.isError && (
        <p className="text-xs text-destructive">
          {createAndSubmitMutation.error instanceof Error
            ? createAndSubmitMutation.error.message
            : "Error al enviar"}
        </p>
      )}

      {!hasAnyVariantSelected && compareRunId && (
        <p className="text-xs text-muted-foreground">
          Seleccioná al menos una variante antes de enviar para aprobación.
        </p>
      )}
    </div>
  );
}
