import { History } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  clientId?: string | null;
  variant?: "icon" | "compact" | "default";
  className?: string;
  title?: string;
}

/**
 * Botão "Ver histórico" — abre a Linha do Tempo do Cliente em /cliente/:clientId.
 * Renderiza nada se não houver clientId.
 */
export default function ClienteHistoryButton({
  clientId,
  variant = "default",
  className = "",
  title = "Ver histórico do cliente",
}: Props) {
  if (!clientId) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (variant === "icon") {
    return (
      <Link
        to={`/cliente/${clientId}`}
        onClick={stop}
        title={title}
        className={`p-1 rounded text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-colors ${className}`}
      >
        <History className="h-3.5 w-3.5" />
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        to={`/cliente/${clientId}`}
        onClick={stop}
        title={title}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 border border-border hover:bg-muted rounded transition-colors ${className}`}
      >
        <History className="w-3 h-3" />
        Histórico
      </Link>
    );
  }

  return (
    <Link
      to={`/cliente/${clientId}`}
      onClick={stop}
      title={title}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border hover:bg-muted rounded transition-colors ${className}`}
    >
      <History className="w-3.5 h-3.5" />
      Ver histórico
    </Link>
  );
}