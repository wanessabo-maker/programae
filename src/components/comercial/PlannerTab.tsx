import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, ExternalLink, MessageSquare, Loader2, Search, User, Palette } from "lucide-react";
import { Clock, Pencil } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

type PlannerStatus =
  | "AGUARDANDO_INICIO" | "INICIADO" | "CONCLUIDO" | "VENDIDO" | "PERDIDO";

const COLUMNS: { id: PlannerStatus; label: string; accent: string }[] = [
  { id: "AGUARDANDO_INICIO", label: "Aguardando Início", accent: "border-amber-400/60" },
  { id: "INICIADO",          label: "Iniciado",          accent: "border-white/40" },
  { id: "CONCLUIDO",         label: "Concluído",         accent: "border-green-400/60" },
  { id: "VENDIDO",           label: "Vendido",           accent: "border-green-400" },
  { id: "PERDIDO",           label: "Perdido",           accent: "border-white/15" },
];

interface PlannerCard {
  id: string;
  name: string;
  planner_status: PlannerStatus | null;
  planner_observacao: string | null;
  planner_link: string | null;
  planner_motivo_perda: string | null;
  closed_value: number | null;
  client_id: string | null;
  planner_status_at: string | null;
  responsible_id: string | null;
  apresentacao_projetista_id: string | null;
  clients?: { id: string; name: string } | null;
  responsible?: { id: string; name: string } | null;
  apresentacao_projetista?: { id: string; name: string } | null;
}

// ── Hooks ────────────────────────────────────────────────────────────
function useCards() {
  return useQuery({
    queryKey: ["planner_kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, planner_status, planner_observacao, planner_link, planner_motivo_perda, closed_value, client_id, planner_status_at, responsible_id, apresentacao_projetista_id, clients(id, name), responsible:team_members!projects_responsible_id_fkey(id, name), apresentacao_projetista:team_members!projects_apresentacao_projetista_id_fkey(id, name)")
        .not("planner_status", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PlannerCard[];
    },
  });
}

function useUpdateStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: { id: string; status: PlannerStatus; extra?: Record<string, any> }) => {
      const { error } = await supabase
        .from("projects")
        .update({ planner_status: vars.status, ...(vars.extra ?? {}) })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      toast({ title: "Status atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Modal Novo Projeto ───────────────────────────────────────────────
function NovoProjetoModal({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; name: string } | null>(null);
  const [novoCliente, setNovoCliente] = useState("");
  const [observacao, setObservacao] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ["planner_clientes_busca", clienteBusca],
    queryFn: async () => {
      if (clienteBusca.length < 2) return [];
      const { data } = await supabase
        .from("clients").select("id, name").ilike("name", `%${clienteBusca}%`).limit(8);
      return data ?? [];
    },
    enabled: clienteBusca.length >= 2 && !clienteSelecionado,
  });

  const reset = () => {
    setClienteBusca(""); setClienteSelecionado(null); setNovoCliente("");
    setObservacao(""); setLink("");
  };

  const handleSave = async () => {
    if (!clienteSelecionado && !novoCliente.trim()) {
      toast({ title: "Informe um cliente", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Get team_member_id
      const { data: tm } = await supabase
        .from("team_members").select("id").eq("user_id", user?.id).maybeSingle();

      let clientId = clienteSelecionado?.id;
      let clientName = clienteSelecionado?.name;

      if (!clientId) {
        const { data: novo, error: ce } = await supabase
          .from("clients")
          .insert({ name: novoCliente.trim(), created_by: tm?.id })
          .select("id, name").single();
        if (ce) throw ce;
        clientId = novo.id;
        clientName = novo.name;
      }

      const { error: pe } = await supabase.from("projects").insert({
        name: clientName ?? "Novo projeto",
        client_id: clientId,
        planner_status: "AGUARDANDO_INICIO",
        planner_observacao: observacao || null,
        planner_link: link || null,
        created_by: tm?.id,
        responsible_id: tm?.id,
        stage: "lead",
        status: "prospecting",
        origin_type: "planner",
      });
      if (pe) throw pe;

      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      toast({ title: "Projeto adicionado ao Planner" });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (!b) reset(); }}>
      <DialogContent className="bg-background border-border">
        <DialogHeader>
          <DialogTitle>Novo projeto no Planner</DialogTitle>
          <DialogDescription>Cliente, observação e link dos dados do projeto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {clienteSelecionado ? (
            <div className="flex items-center justify-between border border-border rounded p-2">
              <div className="text-sm">{clienteSelecionado.name}</div>
              <Button size="sm" variant="ghost" onClick={() => setClienteSelecionado(null)}>Trocar</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar cliente existente..."
                  value={clienteBusca}
                  onChange={(e) => setClienteBusca(e.target.value)}
                />
              </div>
              {clientes.length > 0 && (
                <div className="border border-border rounded max-h-40 overflow-auto">
                  {clientes.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => { setClienteSelecionado(c); setClienteBusca(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground">Ou cadastre um novo:</div>
              <Input
                placeholder="Nome do novo cliente"
                value={novoCliente}
                onChange={(e) => setNovoCliente(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder="Notas, contexto, particularidades..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Link dados do projeto</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal Vendido ────────────────────────────────────────────────────
function VendidoModal({ card, onClose }: { card: PlannerCard | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!card) return;
    const closedValue = parseFloat(valor) || null;
    const today = new Date().toISOString().slice(0, 10);
    setSaving(true);
    try {
      // 1. Update project
      const { error: pErr } = await supabase
        .from("projects")
        .update({
          planner_status: "VENDIDO",
          closed_value: closedValue,
          closed_date: today,
          stage: "closed_won",
          status: "closed",
        })
        .eq("id", card.id);
      if (pErr) throw pErr;

      // 2. Update client status
      if (card.client_id) {
        await supabase.from("clients").update({ status: "closed" }).eq("id", card.client_id);
      }

      // 3. Find "Venda" action type
      const { data: vendaType } = await supabase
        .from("action_types")
        .select("id, points, bonus_points_with_professional")
        .eq("classification", "venda")
        .ilike("name", "Venda")
        .maybeSingle();

      // 4. Create the Venda action (consultant = responsible_id from card)
      if (vendaType && card.responsible_id) {
        const { data: actionRow, error: aErr } = await supabase
          .from("actions")
          .insert({
            consultant_id: card.responsible_id,
            action_type_id: vendaType.id,
            action_date: today,
            value: closedValue,
            client_name: card.clients?.name ?? null,
            project_id: card.id,
            notes: "Gerada automaticamente pela mudança de card no Pipeline (VENDIDO).",
          })
          .select("id")
          .single();
        if (aErr) console.error("Erro criando action venda", aErr);

        // 5. Programa E+ — pontos da venda
        const points = vendaType.points || 0;
        if (actionRow && points > 0) {
          await supabase.from("credit_transactions").insert({
            consultant_id: card.responsible_id,
            action_id: actionRow.id,
            points,
            description: `Venda — ${card.clients?.name ?? card.name}`,
            transaction_date: today,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["actions"] });
      qc.invalidateQueries({ queryKey: ["credit_transactions"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Venda registrada", description: "Dashboard, Comercial, Projetos e Programa E+ atualizados." });
      setValor("");
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={!!card} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="bg-background border-border">
        <DialogHeader>
          <DialogTitle>Marcar como Vendido</DialogTitle>
          <DialogDescription>{card?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Valor da venda (R$)</Label>
          <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal Perdido ────────────────────────────────────────────────────
function PerdidoModal({ card, onClose }: { card: PlannerCard | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from("projects")
        .update({
          planner_status: "PERDIDO",
          planner_motivo_perda: motivo || null,
          stage: "closed_lost",
          status: "lost",
          closed_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", card.id);
      if (pErr) throw pErr;

      if (card.client_id) {
        await supabase.from("clients").update({ status: "lost" }).eq("id", card.client_id);
      }

      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Projeto marcado como perdido", description: "Carteira flutuante e perfil de clientes atualizados." });
      setMotivo("");
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={!!card} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="bg-background border-border">
        <DialogHeader>
          <DialogTitle>Marcar como Perdido</DialogTitle>
          <DialogDescription>{card?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Motivo da perda</Label>
          <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que esse projeto foi perdido?" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal Concluído (Projeto de Apresentação) ────────────────────────
function ConcluidoModal({ card, onClose }: { card: PlannerCard | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [ambientes, setAmbientes] = useState("");
  const [valorApresentado, setValorApresentado] = useState("");
  const [foccoNumber, setFoccoNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!card) return;
    if (!card.apresentacao_projetista_id) {
      toast({ title: "Sem Projetista", description: "Defina o Projetista de Apresentação antes de concluir.", variant: "destructive" });
      return;
    }
    const ambCount = parseInt(ambientes) || 0;
    if (ambCount <= 0) {
      toast({ title: "Informe a quantidade de ambientes", variant: "destructive" });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    setSaving(true);
    try {
      // 1. Update project: status na pipeline + valor + focco se informado
      const projectUpdates: any = {
        planner_status: "CONCLUIDO",
        stage: "em_negociacao",
      };
      const valNum = parseFloat(valorApresentado);
      if (!isNaN(valNum) && valNum > 0) projectUpdates.estimated_value = valNum;
      if (foccoNumber.trim()) projectUpdates.focco_project_number = foccoNumber.trim();

      const { error: pErr } = await supabase
        .from("projects")
        .update(projectUpdates)
        .eq("id", card.id);
      if (pErr) throw pErr;

      // 2. Find "Projeto de Apresentação" action type
      const { data: actionType } = await supabase
        .from("action_types")
        .select("id, points")
        .eq("classification", "projeto")
        .ilike("name", "Projeto de Apresentação")
        .maybeSingle();

      if (!actionType) {
        toast({ title: "Tipo de ação não encontrado", description: "Configure 'Projeto de Apresentação' nos tipos de ação.", variant: "destructive" });
        setSaving(false);
        return;
      }

      // 3. Create action (consultor = projetista responsavel pela apresentação)
      const { data: actionRow, error: aErr } = await supabase
        .from("actions")
        .insert({
          consultant_id: card.apresentacao_projetista_id,
          action_type_id: actionType.id,
          action_date: today,
          environment_count: ambCount,
          client_name: card.clients?.name ?? null,
          focco_project_number: foccoNumber.trim() || null,
          project_id: card.id,
          notes: "Gerada automaticamente pela mudança de card no Pipeline (CONCLUIDO).",
        })
        .select("id")
        .single();
      if (aErr) throw aErr;

      // 4. Project environment record (1 ambiente = 1 ponto para projetista)
      if (actionRow) {
        const compMonth = today.slice(0, 8) + "01";
        await supabase.from("project_environments").insert({
          environment_type: "apresentacao",
          environment_count: ambCount,
          projetista_id: card.apresentacao_projetista_id,
          consultant_id: card.responsible_id,
          project_id: card.id,
          action_id: actionRow.id,
          competence_month: compMonth,
        });

        // 5. Programa E+ — 1 ponto por ambiente
        await supabase.from("credit_transactions").insert({
          consultant_id: card.apresentacao_projetista_id,
          action_id: actionRow.id,
          points: ambCount,
          description: `Projeto de Apresentação — ${card.clients?.name ?? card.name} (${ambCount} amb.)`,
          transaction_date: today,
        });

        // 6. Histórico de valor apresentado
        if (!isNaN(valNum) && valNum > 0) {
          await supabase.from("project_value_history").insert({
            project_id: card.id,
            presented_value: valNum,
            consultant_id: card.responsible_id,
            action_id: actionRow.id,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["actions"] });
      qc.invalidateQueries({ queryKey: ["credit_transactions"] });
      qc.invalidateQueries({ queryKey: ["project-environments"] });
      toast({ title: "Apresentação concluída", description: `${ambCount} ambiente(s) registrados no Programa E+.` });
      setAmbientes(""); setValorApresentado(""); setFoccoNumber("");
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!card} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="bg-background border-border">
        <DialogHeader>
          <DialogTitle>Marcar como Concluído</DialogTitle>
          <DialogDescription>{card?.clients?.name ?? card?.name} — Projeto de Apresentação</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Quantidade de ambientes *</Label>
            <Input type="number" min="1" value={ambientes} onChange={(e) => setAmbientes(e.target.value)} placeholder="Ex: 3" />
            <p className="text-[11px] text-muted-foreground">1 ambiente = 1 ponto no Programa E+ para o projetista.</p>
          </div>
          <div className="space-y-2">
            <Label>Valor apresentado (R$)</Label>
            <Input type="number" value={valorApresentado} onChange={(e) => setValorApresentado(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Número FOCCO (opcional)</Label>
            <Input value={foccoNumber} onChange={(e) => setFoccoNumber(e.target.value)} placeholder="Ex: 12345" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Conclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Card ─────────────────────────────────────────────────────────────
function Card({ card, onEdit }: { card: PlannerCard; onEdit: (c: PlannerCard) => void }) {
  const days = card.planner_status_at
    ? Math.max(0, Math.floor((Date.now() - new Date(card.planner_status_at).getTime()) / 86400000))
    : null;
  const isFinal = card.planner_status === "VENDIDO" || card.planner_status === "PERDIDO";
  const isLate = days !== null && days > 10 && !isFinal;
  const showProjetista =
    card.planner_status === "INICIADO" ||
    card.planner_status === "CONCLUIDO" ||
    card.planner_status === "PERDIDO" ||
    card.planner_status === "VENDIDO";
  return (
    <div
      onClick={() => onEdit(card)}
      className="bg-neutral-900 border border-white/10 rounded p-3 space-y-2 hover:border-white/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-white truncate">
          {card.clients?.name || card.name}
        </div>
        {days !== null && !isFinal && (
          <span
            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
              isLate
                ? "bg-amber-400/15 text-amber-400 border border-amber-400/40"
                : "bg-white/5 text-white/50 border border-white/10"
            }`}
            title={`Nesta coluna há ${days} dia(s)`}
          >
            <Clock className="h-3 w-3" />
            {days}d
          </span>
        )}
      </div>
      {card.responsible?.name && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/70">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{card.responsible.name}</span>
        </div>
      )}
      {showProjetista && card.apresentacao_projetista?.name && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/70">
          <Palette className="h-3 w-3 shrink-0" />
          <span className="truncate">{card.apresentacao_projetista.name}</span>
        </div>
      )}
      {card.planner_observacao && (
        <div className="flex items-start gap-1.5 text-xs text-white/60">
          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{card.planner_observacao}</span>
        </div>
      )}
      {card.planner_link && (
        <a
          href={card.planner_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs text-amber-400 hover:underline truncate"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">Dados do projeto</span>
        </a>
      )}
      {card.planner_status === "VENDIDO" && card.closed_value && (
        <div className="text-xs text-green-400">R$ {card.closed_value.toLocaleString("pt-BR")}</div>
      )}
      {card.planner_status === "PERDIDO" && card.planner_motivo_perda && (
        <div className="text-xs text-white/40 italic line-clamp-2">{card.planner_motivo_perda}</div>
      )}
    </div>
  );
}

// ── Modal Editar Card ────────────────────────────────────────────────
function EditCardModal({ card, onClose }: { card: PlannerCard | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clienteNome, setClienteNome] = useState("");
  const [observacao, setObservacao] = useState("");
  const [link, setLink] = useState("");
  const [statusAt, setStatusAt] = useState("");
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [projetistaId, setProjetistaId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["planner_team_members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, name")
        .eq("active", true)
        .order("name");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (card) {
      setClienteNome(card.clients?.name || card.name);
      setObservacao(card.planner_observacao || "");
      setLink(card.planner_link || "");
      setStatusAt(card.planner_status_at ? card.planner_status_at.slice(0, 10) : "");
      setResponsibleId(card.responsible_id || "");
      setProjetistaId(card.apresentacao_projetista_id || "");
    }
  }, [card]);

  const handleClose = () => {
    setClienteNome(""); setObservacao(""); setLink(""); setStatusAt("");
    setResponsibleId(""); setProjetistaId("");
    onClose();
  };

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      // Update client name if changed and there's a client
      if (card.client_id && clienteNome.trim() && clienteNome !== card.clients?.name) {
        const { error: ce } = await supabase
          .from("clients")
          .update({ name: clienteNome.trim() })
          .eq("id", card.client_id);
        if (ce) throw ce;
      }

      // Update project planner fields
      const updates: any = {
        name: clienteNome.trim() || card.name,
        planner_observacao: observacao || null,
        planner_link: link || null,
        responsible_id: responsibleId || null,
        apresentacao_projetista_id: projetistaId || null,
      };
      if (statusAt) {
        // store as ISO at noon to avoid TZ shift
        updates.planner_status_at = new Date(`${statusAt}T12:00:00`).toISOString();
      }
      const { error: pe } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", card.id);
      if (pe) throw pe;

      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      toast({ title: "Card atualizado" });
      handleClose();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!card} onOpenChange={(b) => !b && handleClose()}>
      <DialogContent className="bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Editar card
          </DialogTitle>
          <DialogDescription>Atualize os dados deste projeto no Pipeline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome do cliente</Label>
            <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Consultor</Label>
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Selecionar —</option>
                {teamMembers.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Projetista de Apresentação</Label>
              <select
                value={projetistaId}
                onChange={(e) => setProjetistaId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Selecionar —</option>
                {teamMembers.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data de adição a esta coluna</Label>
            <Input type="date" value={statusAt} onChange={(e) => setStatusAt(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Define a partir de qual dia o contador "dias na coluna" deve começar.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Link dados do projeto</Label>
            <Input type="url" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ─────────────────────────────────────────────
export function PlannerTab() {
  const { data: cards = [], isLoading } = useCards();
  const upd = useUpdateStatus();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [novoOpen, setNovoOpen] = useState(false);
  const [vendidoCard, setVendidoCard] = useState<PlannerCard | null>(null);
  const [perdidoCard, setPerdidoCard] = useState<PlannerCard | null>(null);
  const [concluidoCard, setConcluidoCard] = useState<PlannerCard | null>(null);
  const [editCard, setEditCard] = useState<PlannerCard | null>(null);
  const [revertConfirm, setRevertConfirm] = useState<{
    card: PlannerCard;
    dest: PlannerStatus;
    from: PlannerStatus;
  } | null>(null);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = cards.filter((c) => c.planner_status === col.id);
    return acc;
  }, {} as Record<PlannerStatus, PlannerCard[]>);

  const avgDaysByColumn = COLUMNS.reduce((acc, col) => {
    const list = grouped[col.id].filter((c) => !!c.planner_status_at);
    if (list.length === 0) { acc[col.id] = null; return acc; }
    const total = list.reduce((sum, c) => {
      const days = Math.max(0, Math.floor((Date.now() - new Date(c.planner_status_at!).getTime()) / 86400000));
      return sum + days;
    }, 0);
    acc[col.id] = Math.round((total / list.length) * 10) / 10;
    return acc;
  }, {} as Record<PlannerStatus, number | null>);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const dest = destination.droppableId as PlannerStatus;
    const src = source.droppableId as PlannerStatus;
    const card = cards.find((c) => c.id === draggableId);
    if (!card) return;

    // Reverter de VENDIDO/PERDIDO/CONCLUIDO precisa de confirmação e limpeza
    if (src === "VENDIDO" || src === "PERDIDO" || src === "CONCLUIDO") {
      setRevertConfirm({ card, dest, from: src });
      return;
    }

    if (dest === "VENDIDO") { setVendidoCard(card); return; }
    if (dest === "PERDIDO") { setPerdidoCard(card); return; }
    if (dest === "CONCLUIDO") { setConcluidoCard(card); return; }

    upd.mutate({ id: draggableId, status: dest });
  };

  const handleRevert = async () => {
    if (!revertConfirm) return;
    const { card, dest, from } = revertConfirm;
    try {
      const projectUpdates: any = {
        planner_status: dest,
        stage: dest === "CONCLUIDO" || dest === "INICIADO" || dest === "AGUARDANDO_INICIO"
          ? "em_negociacao"
          : null,
        status: "prospecting",
        closed_value: null,
        closed_date: null,
      };
      if (from === "PERDIDO") projectUpdates.planner_motivo_perda = null;
      const { error: pe } = await supabase.from("projects").update(projectUpdates).eq("id", card.id);
      if (pe) throw pe;

      // Cliente volta para activo
      if (card.client_id) {
        await supabase.from("clients").update({ status: "active" }).eq("id", card.client_id);
      }

      // Se vinha de VENDIDO/CONCLUIDO, remover Actions auto-geradas + créditos + ambientes
      if (from === "VENDIDO" || from === "CONCLUIDO") {
        const tag = from === "VENDIDO" ? "%Pipeline%VENDIDO%" : "%Pipeline%CONCLUIDO%";
        const { data: autoActions } = await supabase
          .from("actions")
          .select("id")
          .eq("project_id", card.id)
          .ilike("notes", tag);
        const ids = (autoActions ?? []).map((a) => a.id);
        if (ids.length) {
          await supabase.from("credit_transactions").delete().in("action_id", ids);
          await supabase.from("project_environments").delete().in("action_id", ids);
          await supabase.from("project_value_history").delete().in("action_id", ids);
          await supabase.from("actions").delete().in("id", ids);
        }
      }

      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["actions"] });
      qc.invalidateQueries({ queryKey: ["credit_transactions"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["project-environments"] });
      toast({
        title: "Card revertido",
        description: from === "VENDIDO"
          ? "Ação de venda e pontos do Programa E+ foram removidos."
          : from === "CONCLUIDO"
            ? "Ação, ambientes e pontos do Programa E+ foram removidos."
            : "Status de perda removido.",
      });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setRevertConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">
          Arraste os cards entre as colunas para mudar o status.
        </p>
        <Button onClick={() => setNovoOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-white/40 py-12">Carregando...</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {COLUMNS.map((col) => (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`border-t-2 ${col.accent} bg-white/[0.02] rounded p-2 min-h-[300px] transition-colors ${
                      snapshot.isDraggingOver ? "bg-white/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between px-1 pb-2">
                      <h3 className="text-[10px] tracking-widest uppercase text-white/70 font-medium">
                        {col.label}
                      </h3>
                      <span className="text-xs text-white/40">{grouped[col.id].length}</span>
                    </div>
                    <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                      {grouped[col.id].map((card, i) => (
                        <Draggable draggableId={card.id} index={i} key={card.id}>
                          {(p, snap) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                              style={p.draggableProps.style}
                              className={snap.isDragging ? "opacity-80" : ""}
                            >
                              <Card card={card} onEdit={setEditCard} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      <NovoProjetoModal open={novoOpen} onOpenChange={setNovoOpen} />
      <VendidoModal card={vendidoCard} onClose={() => setVendidoCard(null)} />
      <PerdidoModal card={perdidoCard} onClose={() => setPerdidoCard(null)} />
      <ConcluidoModal card={concluidoCard} onClose={() => setConcluidoCard(null)} />
      <EditCardModal card={editCard} onClose={() => setEditCard(null)} />

      <Dialog open={!!revertConfirm} onOpenChange={(b) => !b && setRevertConfirm(null)}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>
              Reverter card de {revertConfirm?.from === "VENDIDO" ? "Vendido" : revertConfirm?.from === "CONCLUIDO" ? "Concluído" : "Perdido"}?
            </DialogTitle>
            <DialogDescription>
              {revertConfirm?.from === "VENDIDO" ? (
                <>
                  Isto vai <strong>excluir a ação de Venda</strong> gerada automaticamente,
                  remover os <strong>pontos do Programa E+</strong> dela e zerar o valor fechado do projeto.
                  Ações de venda criadas manualmente (pelo Registro de Ação) não serão tocadas.
                </>
              ) : revertConfirm?.from === "CONCLUIDO" ? (
                <>
                  Isto vai <strong>excluir a ação de Projeto de Apresentação</strong> gerada automaticamente,
                  os <strong>ambientes registrados</strong> e os <strong>pontos do Programa E+</strong> dela.
                  Registros criados manualmente não serão tocados.
                </>
              ) : (
                <>Isto vai limpar o motivo da perda e devolver o cliente ao status ativo.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRevert}>Confirmar reversão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
