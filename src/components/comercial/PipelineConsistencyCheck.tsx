import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Issue = {
  projectId: string;
  label: string;
  focco: string | null;
  status: string | null;
  closedValue: number;
  somaVendas: number;
  ultimaVenda: string | null;
  vendasCount: number;
  kinds: string[];
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

function useConsistency() {
  return useQuery({
    queryKey: ["pipeline_consistency"],
    queryFn: async (): Promise<Issue[]> => {
      const [{ data: projects, error: pErr }, { data: actions, error: aErr }] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, focco_project_number, planner_status, closed_value, closed_date, clients(name)"),
        supabase
          .from("actions")
          .select("id, project_id, value, action_date, action_type:action_types!inner(classification)")
          .eq("action_types.classification", "venda"),
      ]);
      if (pErr) throw pErr;
      if (aErr) throw aErr;

      const agg = new Map<string, { total: number; ultima: string | null; count: number }>();
      for (const a of actions ?? []) {
        if (!a.project_id) continue;
        const cur = agg.get(a.project_id) ?? { total: 0, ultima: null, count: 0 };
        cur.total += Number(a.value ?? 0);
        cur.count += 1;
        if (!cur.ultima || (a.action_date && a.action_date > cur.ultima)) cur.ultima = a.action_date;
        agg.set(a.project_id, cur);
      }

      const issues: Issue[] = [];
      for (const p of projects ?? []) {
        const sum = agg.get(p.id);
        const closed = Number(p.closed_value ?? 0);
        const kinds: string[] = [];

        if (sum) {
          if (Math.abs(sum.total - closed) > 0.01) kinds.push("valor divergente");
          if (p.planner_status !== "VENDIDO") kinds.push("venda registrada fora de VENDIDO");
        } else if (p.planner_status === "VENDIDO") {
          kinds.push("VENDIDO sem ação de venda");
        }

        if (kinds.length) {
          issues.push({
            projectId: p.id,
            label: (p as any).clients?.name || p.name,
            focco: p.focco_project_number,
            status: p.planner_status,
            closedValue: closed,
            somaVendas: sum?.total ?? 0,
            ultimaVenda: sum?.ultima ?? null,
            vendasCount: sum?.count ?? 0,
            kinds,
          });
        }
      }
      return issues.sort((a, b) => (b.somaVendas - b.closedValue) - (a.somaVendas - a.closedValue));
    },
  });
}

export function PipelineConsistencyCheck() {
  const [open, setOpen] = useState(false);
  const [fixing, setFixing] = useState(false);
  const qc = useQueryClient();
  const { data: issues = [], isLoading, isFetching, refetch } = useConsistency();

  const fixable = issues.filter((i) => i.vendasCount > 0);

  const handleFix = async () => {
    setFixing(true);
    try {
      for (const i of fixable) {
        const closedDate = i.ultimaVenda;
        const { error } = await supabase
          .from("projects")
          .update({
            closed_value: i.somaVendas,
            closed_date: closedDate,
            stage: "closed_won",
            status: "closed",
            planner_status: "VENDIDO",
            planner_data_vendido: closedDate ? new Date(`${closedDate}T12:00:00`).toISOString() : new Date().toISOString(),
            planner_status_at: new Date().toISOString(),
          } as any)
          .eq("id", i.projectId);
        if (error) throw error;
      }
      toast.success(`${fixable.length} projeto(s) reprocessado(s) no Pipeline.`);
      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      await refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao reprocessar");
    } finally {
      setFixing(false);
    }
  };

  const hasIssues = issues.length > 0;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="gap-2"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasIssues ? (
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-green-400" />
        )}
        Consistência
        {hasIssues && (
          <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px]">
            {issues.length}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Consistência do Pipeline — VENDIDO</DialogTitle>
            <DialogDescription>
              Compara a soma das vendas e aditivos registrados de cada projeto com o valor fechado
              exibido no card de VENDIDO.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {isFetching && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
              </div>
            )}
            {!isFetching && !hasIssues && (
              <div className="flex items-center gap-2 text-sm text-green-400 py-6 justify-center">
                <ShieldCheck className="h-4 w-4" /> Nenhuma divergência encontrada.
              </div>
            )}
            {issues.map((i) => (
              <div key={i.projectId} className="border border-border rounded p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">
                    {i.label}
                    {i.focco && <span className="text-muted-foreground"> · FOCCO {i.focco}</span>}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                    {i.status ?? "sem etapa"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {i.kinds.map((k) => (
                    <Badge key={k} variant="outline" className="text-[10px] border-amber-400/50 text-amber-300">
                      {k}
                    </Badge>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Soma de {i.vendasCount} venda(s)/aditivo(s): <span className="text-white">{brl(i.somaVendas)}</span>
                  {"  ·  "}Valor no card: <span className="text-white">{brl(i.closedValue)}</span>
                  {Math.abs(i.somaVendas - i.closedValue) > 0.01 && (
                    <span className="text-amber-400"> · diferença {brl(i.somaVendas - i.closedValue)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reverificar
            </Button>
            <Button size="sm" onClick={handleFix} disabled={fixing || fixable.length === 0} className="gap-2">
              {fixing && <Loader2 className="h-4 w-4 animate-spin" />}
              Reprocessar {fixable.length > 0 ? `(${fixable.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
