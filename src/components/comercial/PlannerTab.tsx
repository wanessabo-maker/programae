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
import { Plus, ExternalLink, MessageSquare, Loader2, Search } from "lucide-react";
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
  clients?: { id: string; name: string } | null;
}

// ── Hooks ────────────────────────────────────────────────────────────
function useCards() {
  return useQuery({
    queryKey: ["planner_kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, planner_status, planner_observacao, planner_link, planner_motivo_perda, closed_value, client_id, planner_status_at, clients(id, name)")
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
  const upd = useUpdateStatus();
  const [valor, setValor] = useState("");
  const handleSave = () => {
    if (!card) return;
    upd.mutate(
      { id: card.id, status: "VENDIDO", extra: { closed_value: parseFloat(valor) || null, closed_date: new Date().toISOString().slice(0, 10), stage: "closed_won" } },
      { onSuccess: () => { setValor(""); onClose(); } }
    );
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
          <Button onClick={handleSave} disabled={upd.isPending}>Confirmar Venda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal Perdido ────────────────────────────────────────────────────
function PerdidoModal({ card, onClose }: { card: PlannerCard | null; onClose: () => void }) {
  const upd = useUpdateStatus();
  const [motivo, setMotivo] = useState("");
  const handleSave = () => {
    if (!card) return;
    upd.mutate(
      { id: card.id, status: "PERDIDO", extra: { planner_motivo_perda: motivo || null, stage: "closed_lost" } },
      { onSuccess: () => { setMotivo(""); onClose(); } }
    );
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
          <Button onClick={handleSave} disabled={upd.isPending}>Confirmar Perda</Button>
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setClienteNome(card.clients?.name || card.name);
      setObservacao(card.planner_observacao || "");
      setLink(card.planner_link || "");
      setStatusAt(card.planner_status_at ? card.planner_status_at.slice(0, 10) : "");
    }
  }, [card]);

  const handleClose = () => {
    setClienteNome(""); setObservacao(""); setLink(""); setStatusAt("");
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
  const [novoOpen, setNovoOpen] = useState(false);
  const [vendidoCard, setVendidoCard] = useState<PlannerCard | null>(null);
  const [perdidoCard, setPerdidoCard] = useState<PlannerCard | null>(null);
  const [editCard, setEditCard] = useState<PlannerCard | null>(null);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = cards.filter((c) => c.planner_status === col.id);
    return acc;
  }, {} as Record<PlannerStatus, PlannerCard[]>);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const dest = destination.droppableId as PlannerStatus;
    const card = cards.find((c) => c.id === draggableId);
    if (!card) return;

    if (dest === "VENDIDO") { setVendidoCard(card); return; }
    if (dest === "PERDIDO") { setPerdidoCard(card); return; }

    upd.mutate({ id: draggableId, status: dest });
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
                    <div className="space-y-2">
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
      <EditCardModal card={editCard} onClose={() => setEditCard(null)} />
    </div>
  );
}
