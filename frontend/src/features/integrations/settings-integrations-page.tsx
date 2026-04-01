import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Loader2,
  Trash2,
  Plus,
  Wifi,
  WifiOff,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../auth/use-auth";
import {
  fetchConnections,
  createConnection,
  deleteConnection,
  fetchFeatureFlags,
  patchFeatureFlags,
} from "./api";
import type { SocialConnection, FeatureFlags } from "./types";

const NETWORKS = ["linkedin", "x", "instagram"] as const;

function ConnectionCard({ conn }: { conn: SocialConnection }) {
  const { isOwner } = useAuth();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteConnection(conn.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-muted">
        {conn.is_active ? (
          <Wifi size={18} className="text-green-500" />
        ) : (
          <WifiOff size={18} className="text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{conn.display_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {conn.network}
          </span>
          <span
            className={`text-xs ${conn.is_active ? "text-green-600" : "text-muted-foreground"}`}
          >
            {conn.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
      {isOwner && (
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="inline-flex items-center gap-1 rounded-[12px] border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
        >
          {deleteMutation.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} />
          )}
          Remove
        </button>
      )}
    </div>
  );
}

function AddConnectionForm() {
  const queryClient = useQueryClient();
  const [network, setNetwork] = useState<string>(NETWORKS[0]);
  const [displayName, setDisplayName] = useState("");

  const mutation = useMutation({
    mutationFn: () => createConnection({ network, display_name: displayName }),
    onSuccess: () => {
      setDisplayName("");
      void queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm space-y-3 p-4">
      <h3 className="text-sm font-semibold">Add Connection</h3>
      <div className="flex gap-2 flex-wrap">
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <Input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name..."
          className="min-w-[200px] flex-1"
        />
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !displayName.trim()}
        >
          {mutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Add
        </Button>
      </div>
      {mutation.isError && (
        <p className="text-xs text-destructive">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to add connection"}
        </p>
      )}
    </div>
  );
}

function FeatureFlagsSection() {
  const queryClient = useQueryClient();

  const { data: flags, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: fetchFeatureFlags,
  });

  const mutation = useMutation({
    mutationFn: patchFeatureFlags,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["feature-flags"] }),
  });

  if (isLoading || !flags) return null;

  function toggle(network: keyof FeatureFlags) {
    if (!flags) return;
    mutation.mutate({ [network]: !flags[network] });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">
        Network Feature Flags
      </h2>
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm divide-y divide-border">
        {(Object.keys(flags) as (keyof FeatureFlags)[]).map((network) => (
          <div
            key={network}
            className="flex items-center justify-between px-4 py-3"
          >
            <span className="text-sm font-medium text-foreground capitalize">
              {network}
            </span>
            <button
              onClick={() => toggle(network)}
              disabled={mutation.isPending}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {flags[network] ? (
                <ToggleRight size={28} className="text-green-500" />
              ) : (
                <ToggleLeft size={28} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsIntegrationsPage() {
  const { isOwner } = useAuth();

  const {
    data: connections,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["connections"],
    queryFn: fetchConnections,
  });

  return (
    <div className="space-y-6">
      <div className="paper-page-header">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Settings size={20} />
          Settings — Integrations
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage social network connections and feature flags.
        </p>
      </div>

      {isOwner && <AddConnectionForm />}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading connections...
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Failed to load connections. Please refresh the page.
        </p>
      )}

      {connections && connections.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Connections
            <span className="ml-2 font-normal text-muted-foreground">
              ({connections.length})
            </span>
          </h2>
          <div className="grid gap-2">
            {connections.map((conn) => (
              <ConnectionCard key={conn.id} conn={conn} />
            ))}
          </div>
        </div>
      )}

      {connections && connections.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">
          No connections yet.
          {isOwner ? " Add a social network connection above." : ""}
        </p>
      )}

      {isOwner && <FeatureFlagsSection />}
    </div>
  );
}
