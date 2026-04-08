import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { fetchSource } from "./api";

interface SourceDetailProps {
  sourceId: number;
}

export function SourceDetail({ sourceId }: Readonly<SourceDetailProps>) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["design-bank-source", sourceId],
    queryFn: () => fetchSource(sourceId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 size={14} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-red-500">Failed to load source details.</p>
    );
  }

  const hasExtracted =
    data.extracted_data && Object.keys(data.extracted_data).length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Filename
        </p>
        <p className="text-sm">{data.original_filename ?? "—"}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Type
        </p>
        <p className="text-sm">{data.source_type}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Status
        </p>
        <p className="text-sm">{data.status}</p>
      </div>
      {data.url && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            URL
          </p>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline break-all"
          >
            {data.url}
          </a>
        </div>
      )}
      {data.status === "failed" && data.error_message && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-500 uppercase tracking-wide">
            Error
          </p>
          <p className="text-sm text-red-500">{data.error_message}</p>
        </div>
      )}
      {hasExtracted && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Extracted data
          </p>
          <pre className="max-h-64 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-900/60 p-3 text-xs text-zinc-200">
            {JSON.stringify(data.extracted_data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
