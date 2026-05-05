import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Clock, AlertTriangle } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────
type PlannerStatus =
  | "AGUARDANDO_INICIO"
  | "INICIADO"
  | "CONCLUIDO"
  | "VENDIDO"
  | "PERDIDO"
  | "PAUSADO";

interface PlannerRow {
  id: string;
  name: string;
  planner_status: PlannerStatus;
  data_captacao: string | null;
  planner_data_aguardando: string | null;
  planner_data_iniciado: string | null;
  planner_data_concluido: string | null;
  planner_dias_ate_aguardando: number | null;
  planner_dias_aguardando: number | null;
  planner_dias_iniciado: number | null;
  projetista_nome: string | null;
  consultor_nome: string | null;
  cliente_nome: string | null;
  contract_number: string | null;
  qtd_ambientes: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<PlannerStatus, string> = {
  AGUARDANDO_INICIO: "Aguardando Início",
  INICIADO: "Iniciado",
  CONCLUIDO: "Concluído",
  VENDIDO: "Vendido",
  PERDIDO: "Perdido",
  PAUSADO: "Pausado",
};

// Design system: preto/branco/neutro com green-400 e amber-400
const STATUS_BADGE: Record<PlannerStatus, string> = {
  AGUARDANDO_INICIO: "border border-amber-400 text-amber-400 bg-transparent",
  INICIADO:          "border border-white/40 text-white bg-transparent",
  CONCLUIDO:         "border border-green-400 text-green-400 bg-transparent",
  VENDIDO:           "bg-green-400 text-black",
  PERDIDO:           "border border-white/20 text-white/40 bg-transparent",
  PAUSADO:           "border border-white/20 text-white/40 bg-transparent",
};

const PROXIMOS: Record<PlannerStatus, PlannerStatus[]> = {
  AGUARDANDO_INICIO: ["INICIADO", "PAUSADO", "PERDIDO"],
  INICIADO:          ["CONCLUIDO", "PAUSADO", "PERDIDO"],
  CONCLUIDO:         ["VENDIDO", "PERDIDO"],
  VENDIDO:           [],
  PERDIDO:           [],
  PAUSADO:           ["AGUARDANDO_INICIO", "INICIADO", "PERDIDO"],
};

function diasLabel(dias: number | null): string {
  if (dias === null) return "—";
  if (dias === 0) return "hoje";
  return `${dias}d`;
}

function DiasCell({
  dias,
  alerta,
}: {
  dias: number | null;
  alerta: number;
}) {
  if (dias === null) return <span className="text-white/30">—</span>;
  const over = dias >= alerta;
  return (
    <span
      className={`flex items-center gap-1 text-xs ${
        over ? "text-amber-400" : "text-white/60"
      }`}
    >
      {over && <AlertTriangle className="h-3 w-3" />}
      {diasLabel(dias)}
    </span>
  );
}

// ── Hook de dados ─────────────────────────────────────────────────────────────
function usePlannerRows(filtroStatus: string) {
  return useQuery({
    queryKey: ["planner_apresentacao", filtroStatus],
    queryFn: async () => {
      let q = supabase
        .from("vw_planner_apresentacao")
        .select("*")
        .order("planner_data_aguardando", { ascending: true });

      if (filtroStatus && filtroStatus !== "TODOS") {
        q = q.eq("planner_status", filtroStatus);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PlannerRow[];
    },
  });
}

function useAtualizarStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: PlannerStatus;
    }) => {
      const { error } = await supabase
        .from("projects")
        .update({ planner_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["planner_apresentacao"] });
      // Quando VENDIDO ou PERDIDO, invalida também contratos e comercial
      if (vars.status === "VENDIDO" || vars.status === "PERDIDO") {
        qc.invalidateQueries({ queryKey: ["clients"] });
        qc.invalidateQueries({ queryKey: ["projects"] });
      }
      toast({ title: `Status atualizado: ${STATUS_LABEL[vars.status]}` });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

// ── Componente principal ──────────────────────────────────────────────────────
export function PlannerTab() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  const { data: rows = [], isLoading } = usePlannerRows(filtroStatus);
  const { mutate: atualizar, isPending } = useAtualizarStatus();

  const filtrado = rows.filter((r) =>
    !busca ||
    r.name.toLowerCase().includes(busca.toLowerCase()) ||
    (r.cliente_nome ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (r.projetista_nome ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
          <Input
            className="pl-8 h-9 bg-transparent border-white/20 text-white placeholder:text-white/30"
            placeholder="Buscar projeto ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48 h-9 bg-transparent border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as PlannerStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-white/40 ml-auto">
          {filtrado.length} projeto{filtrado.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabela — Table View conforme memória do projeto */}
      <div className="rounded-md border border-white/10 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60 font-medium">Projeto / Cliente</TableHead>
              <TableHead className="text-white/60 font-medium">Status</TableHead>
              <TableHead className="text-white/60 font-medium">Projetista</TableHead>
              <TableHead className="text-white/60 font-medium text-center">Amb.</TableHead>
              <TableHead className="text-white/60 font-medium text-center">
                <span className="flex items-center gap-1 justify-center">
                  <Clock className="h-3.5 w-3.5" />
                  Fila
                </span>
              </TableHead>
              <TableHead className="text-white/60 font-medium text-center">
                <span className="flex items-center gap-1 justify-center">
                  <Clock className="h-3.5 w-3.5" />
                  Aguard.
                </span>
              </TableHead>
              <TableHead className="text-white/60 font-medium text-center">
                <span className="flex items-center gap-1 justify-center">
                  <Clock className="h-3.5 w-3.5" />
                  Execução
                </span>
              </TableHead>
              <TableHead className="text-white/60 font-medium w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-white/30 py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtrado.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-white/30 py-8">
                  Nenhum projeto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtrado.map((row) => {
                const proximos = PROXIMOS[row.planner_status] ?? [];
                return (
                  <TableRow
                    key={row.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    {/* Nome + cliente */}
                    <TableCell>
                      <div className="font-medium text-white text-sm">{row.name}</div>
                      {row.cliente_nome && (
                        <div className="text-xs text-white/40">{row.cliente_nome}</div>
                      )}
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <Badge className={`text-xs px-2 py-0.5 ${STATUS_BADGE[row.planner_status]}`}>
                        {STATUS_LABEL[row.planner_status]}
                      </Badge>
                    </TableCell>

                    {/* Projetista */}
                    <TableCell className="text-white/70 text-sm">
                      {row.projetista_nome ?? <span className="text-white/30">—</span>}
                    </TableCell>

                    {/* Ambientes */}
                    <TableCell className="text-center text-white/70 text-sm">
                      {row.qtd_ambientes > 0 ? row.qtd_ambientes : <span className="text-white/30">—</span>}
                    </TableCell>

                    {/* Dias captação → aguardando */}
                    <TableCell className="text-center">
                      <DiasCell dias={row.planner_dias_ate_aguardando} alerta={3} />
                    </TableCell>

                    {/* Dias parado em aguardando */}
                    <TableCell className="text-center">
                      {row.planner_status === "AGUARDANDO_INICIO" || row.planner_status === "PAUSADO" ? (
                        <DiasCell dias={row.planner_dias_aguardando} alerta={5} />
                      ) : (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Dias em iniciado */}
                    <TableCell className="text-center">
                      {row.planner_status === "INICIADO" ? (
                        <DiasCell dias={row.planner_dias_iniciado} alerta={7} />
                      ) : row.planner_dias_iniciado != null ? (
                        <span className="text-white/30 text-xs">{diasLabel(row.planner_dias_iniciado)}</span>
                      ) : (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Ações */}
                    <TableCell>
                      {proximos.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10"
                              disabled={isPending}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSeparator />
                            {proximos.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => atualizar({ id: row.id, status: s })}
                              >
                                Mover para {STATUS_LABEL[s]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
