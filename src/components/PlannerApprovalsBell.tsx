import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ApprovalRow {
  id: string;
  project_id: string;
  requested_by_team_member_id: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  projects?: { id: string; name: string; clients?: { name: string } | null } | null;
  requester?: { id: string; name: string } | null;
}

export function PlannerApprovalsBell() {
  const { isAdmin, hasAreaAccess } = useAuthContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rejectFor, setRejectFor] = useState<ApprovalRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isManager = isAdmin && hasAreaAccess("comercial");

  const { data: pending = [] } = useQuery({
    queryKey: ["planner_start_approvals_pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_start_approvals")
        .select("id, project_id, requested_by_team_member_id, reason, status, created_at, projects(id, name, clients(name)), requester:team_members!planner_start_approvals_requested_by_team_member_id_fkey(id, name)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ApprovalRow[];
    },
    enabled: isManager,
    refetchInterval: 30000,
  });

  const decide = useMutation({
    mutationFn: async (args: { id: string; status: "approved" | "rejected"; reason?: string }) => {
      const { error } = await supabase
        .from("planner_start_approvals")
        .update({ status: args.status, decision_reason: args.reason ?? null })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["planner_start_approvals_pending"] });
      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      toast.success(vars.status === "approved" ? "Início liberado" : "Solicitação recusada");
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  if (!isManager) return null;

  const count = pending.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 hover:bg-muted rounded transition-colors"
        title="Solicitações de liberação"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitações de liberação — Aguardando Início</DialogTitle>
            <DialogDescription>
              Apenas a Gerência Comercial (admin + Comercial) visualiza e aprova essas solicitações.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {pending.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Nenhuma solicitação pendente.
              </div>
            )}
            {pending.map((row) => (
              <div key={row.id} className="border border-border rounded-md p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {row.projects?.clients?.name || row.projects?.name || "Projeto"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Solicitado por <strong>{row.requester?.name || "—"}</strong> em{" "}
                      {new Date(row.created_at).toLocaleString("pt-BR")}
                    </div>
                    {row.reason && (
                      <div className="text-xs mt-1 italic text-muted-foreground">
                        "{row.reason}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectFor(row)}
                      disabled={decide.isPending}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Recusar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => decide.mutate({ id: row.id, status: "approved" })}
                      disabled={decide.isPending}
                    >
                      {decide.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                      Aprovar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={(b) => { if (!b) { setRejectFor(null); setRejectReason(""); } }}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>Recusar solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O solicitante verá essa observação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex.: respeitar a ordem da fila."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setRejectFor(null); setRejectReason(""); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!rejectFor) return;
                await decide.mutateAsync({ id: rejectFor.id, status: "rejected", reason: rejectReason.trim() || undefined });
                setRejectFor(null);
                setRejectReason("");
              }}
              disabled={decide.isPending}
            >
              Confirmar recusa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}