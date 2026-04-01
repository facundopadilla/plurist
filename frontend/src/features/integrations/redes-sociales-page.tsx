import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Unplug,
  Plug,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { StatusBadge } from "../../components/ui/status-badge";
import { StatusMessage } from "../../components/ui/status-message";
import {
  fetchConnections,
  startOAuthConnect,
  disconnectConnection,
} from "./api";
import { NetworkIcon } from "./network-icon";
import type { SocialConnection } from "./types";

const NETWORKS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Publicá en tu perfil o página de empresa",
  },
  {
    id: "x",
    label: "X (Twitter)",
    description: "Publicá tweets desde tu cuenta",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Publicá fotos en tu cuenta de negocios",
  },
] as const;

function connectionStatusProps(status: SocialConnection["status"]) {
  switch (status) {
    case "connected":
      return {
        label: "Conectado",
        tone: "success" as const,
        icon: <CheckCircle size={11} />,
      };
    case "expired":
      return {
        label: "Expirado",
        tone: "warning" as const,
        icon: <AlertCircle size={11} />,
      };
    case "error":
      return {
        label: "Error",
        tone: "danger" as const,
        icon: <AlertCircle size={11} />,
      };
    default:
      return {
        label: "Desconectado",
        tone: "neutral" as const,
        icon: undefined,
      };
  }
}

export function RedesSocialesPage() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const network = searchParams.get("connected");
    if (network) {
      setToast(
        `¡${network.charAt(0).toUpperCase() + network.slice(1)} conectado exitosamente!`,
      );
      setSearchParams({}, { replace: true });
      const timeoutId = window.setTimeout(() => setToast(null), 4000);
      return () => window.clearTimeout(timeoutId);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchConnections()
      .then(setConnections)
      .finally(() => setLoading(false));
  }, []);

  const connectionFor = (network: string) =>
    connections.find((c) => c.network === network && c.is_active);

  const handleConnect = (network: string) => {
    startOAuthConnect(network);
  };

  const handleDisconnect = async (connection: SocialConnection) => {
    setDisconnecting(connection.id);
    try {
      await disconnectConnection(connection.id);
      setConnections((prev) => prev.filter((c) => c.id !== connection.id));
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="max-w-2xl animate-page-in">
      {toast && (
        <StatusMessage
          icon={CheckCircle}
          message={toast}
          tone="success"
          className="mb-6"
        />
      )}

      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Conectá tus cuentas de redes sociales para publicar directamente desde
          Socialclaw.
        </p>
      </div>

      <div className="space-y-3">
        {NETWORKS.map(({ id, label, description }) => {
          const conn = connectionFor(id);
          const isConnected = conn?.status === "connected";
          const needsReconnect = conn && !isConnected;
          const isDisconnecting = conn ? disconnecting === conn.id : false;

          return (
            <div
              key={id}
              className={cn(
                "elegant-card flex items-center gap-4",
                isConnected && "border-green-200 dark:border-green-800/50",
              )}
            >
              <NetworkIcon network={id} size={40} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{label}</span>
                  {conn && (
                    <StatusBadge
                      {...connectionStatusProps(conn.status)}
                      variant="pill"
                    />
                  )}
                </div>
                {conn ? (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {conn.provider_username || conn.display_name}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                  </p>
                )}
                {conn?.error_detail && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 truncate">
                    {conn.error_detail}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {!conn ? (
                  <button
                    onClick={() => handleConnect(id)}
                    disabled={loading}
                    aria-label={`Conectar ${label}`}
                    className="elegant-button-primary gap-1.5"
                  >
                    <Plug size={14} />
                    Conectar
                  </button>
                ) : needsReconnect ? (
                  <button
                    onClick={() => handleConnect(id)}
                    aria-label={`Reconectar ${label}`}
                    className="elegant-button-secondary gap-1.5"
                  >
                    <RefreshCw size={14} />
                    Reconectar
                  </button>
                ) : (
                  <button
                    onClick={() => void handleDisconnect(conn)}
                    disabled={isDisconnecting}
                    aria-label={`Desconectar ${label}`}
                    className="elegant-button-secondary gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                  >
                    <Unplug size={14} />
                    {isDisconnecting ? "Desconectando..." : "Desconectar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <p className="mt-4 text-xs text-muted-foreground">
          Cargando conexiones...
        </p>
      )}
    </div>
  );
}
