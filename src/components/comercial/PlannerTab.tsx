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
import { Clock, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import { useEngenhariaMembers } from "@/hooks/useEngenhariaMembers";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ClienteHistoryButton from "@/components/ClienteHistoryButton";
import { createChecklistForProject } from "@/hooks/useChecklist";

type PlannerStatus =
  | "AGUARDANDO_INICIO" | "INICIADO" | "CONCLUIDO" | "EM_REFORMA" | "VENDIDO" | "PERDIDO" | "PAUSADO";

const COLUMNS: { id: PlannerStatus; label: string; accent: string }[] = [
  { id: "AGUARDANDO_INICIO", label: "Aguardando Início", accent: "border-amber-400/60" },
  { id: "INICIADO",          label: "Iniciado",          accent: "border-white/40" },
  { id: "CONCLUIDO",         label: "Concluído",         accent: "border-green-400/60" },
  { id: "EM_REFORMA",        label: "Em Reforma",        accent: "border-blue-400/60" },
  { id: "VENDIDO",           label: "Vendido",           accent: "border-green-400" },
  { id: "PAUSADO",           label: "Pausado",           accent: "border-yellow-400/60" },
  { id: "PERDIDO",           label: "Perdido",           accent: "border-white/15" },
];

// Only allow http(s) URLs to prevent javascript: / data: XSS via planner_link
const isSafeHttpUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
};
const safeHref = (url: string | null | undefined): string =>
  isSafeHttpUrl(url) ? (url as string) : "#";

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
  planner_data_aguardando: string | null;
  closed_date: string | null;
  responsible_id: string | null;
  apresentacao_projetista_id: string | null;
  origin_type: string | null;
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
        .select("id, name, planner_status, planner_observacao, planner_link, planner_motivo_perda, closed_value, closed_date, client_id, planner_status_at, planner_data_aguardando, responsible_id, apresentacao_projetista_id, origin_type, clients(id, name), responsible:team_members!projects_responsible_id_fkey(id, name), apresentacao_projetista:team_members!projects_apresentacao_projetista_id_fkey(id, name)")
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
  const { user, isAdmin } = useAuthContext();
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; name: string } | null>(null);
  const [novoCliente, setNovoCliente] = useState("");
  const [observacao, setObservacao] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [captacaoActionId, setCaptacaoActionId] = useState<string>("");

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

  // Captações recentes (últimos 90 dias) ainda sem projeto vinculado
  // Consultor vê apenas as próprias captações; Admin vê todas.
  const { data: captacoes = [] } = useQuery({
    queryKey: ["planner_captacoes_disponiveis", user?.id, isAdmin],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

      const { data: at } = await supabase
        .from("action_types")
        .select("id")
        .ilike("name", "Captação de Projeto")
        .maybeSingle();
      if (!at?.id) return [];

      // Resolve current team_member id for non-admin filtering
      let currentTmId: string | null = null;
      if (!isAdmin && user?.id) {
        const { data: tm } = await supabase
          .from("team_members").select("id").eq("user_id", user.id).maybeSingle();
        currentTmId = tm?.id ?? null;
        if (!currentTmId) return [];
      }

      let q = supabase
        .from("actions")
        .select("id, action_date, consultant_id, client_name, notes, focco_project_number, professional_id, team_members:consultant_id(name), professionals:professional_id(name)")
        .eq("action_type_id", at.id)
        .gte("action_date", cutoff)
        .order("action_date", { ascending: false })
        .limit(50);
      if (!isAdmin && currentTmId) {
        q = q.eq("consultant_id", currentTmId);
      }
      const { data: acts } = await q;
      if (!acts?.length) return [];

      const ids = acts.map((a: any) => a.id);
      const { data: linked } = await supabase
        .from("projects")
        .select("origin_action_id")
        .in("origin_action_id", ids);
      const usedIds = new Set((linked ?? []).map((p: any) => p.origin_action_id));

      return acts.filter((a: any) => !usedIds.has(a.id));
    },
    enabled: open,
  });

  const reset = () => {
    setClienteBusca(""); setClienteSelecionado(null); setNovoCliente("");
    setObservacao(""); setLink(""); setCaptacaoActionId("");
  };

  const handleSave = async () => {
    if (!clienteSelecionado && !novoCliente.trim()) {
      toast({ title: "Informe um cliente", variant: "destructive" });
      return;
    }
    if (!captacaoActionId) {
      toast({
        title: "Vínculo com Captação obrigatório",
        description: "Selecione a ação de Captação que originou este projeto.",
        variant: "destructive",
      });
      return;
    }
    if (link.trim() && !isSafeHttpUrl(link)) {
      toast({ title: "Link inválido", description: "Use http(s)://", variant: "destructive" });
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
        stage: "em_negociacao",
        status: "prospecting",
        origin_type: "planner",
        origin_action_id: captacaoActionId || null,
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
              <Button size="sm" variant="ghost" onClick={() => { setClienteSelecionado(null); setCaptacaoActionId(""); }}>Trocar</Button>
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
            <Label>Captação de origem <span className="text-amber-400">*</span></Label>
            {captacoes.length === 0 ? (
              <p className="text-xs text-amber-400 border border-amber-400/40 rounded p-2">
                Nenhuma Captação de Projeto disponível nos últimos 90 dias. Registre uma ação de Captação antes de adicionar o projeto ao Pipeline.
              </p>
            ) : (
              <select
                value={captacaoActionId}
                onChange={(e) => setCaptacaoActionId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Selecionar Captação —</option>
                {captacoes.map((a: any) => {
                  const consultor = a.team_members?.name ?? "—";
                  const data = a.action_date
                    ? new Date(`${a.action_date}T12:00:00`).toLocaleDateString("pt-BR")
                    : "";
                  const cli = a.client_name ? ` · Cliente: ${a.client_name}` : "";
                  const arq = a.professionals?.name ? ` · Arquiteto: ${a.professionals.name}` : "";
                  const focco = a.focco_project_number ? ` · FOCCO ${a.focco_project_number}` : "";
                  return (
                    <option key={a.id} value={a.id}>
                      {data} · {consultor}{cli}{arq}{focco}
                    </option>
                  );
                })}
              </select>
            )}
            <p className="text-xs text-muted-foreground">
              Obrigatório. Toda apresentação no Pipeline deve nascer de uma Captação registrada.
            </p>
          </div>

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
  const { dualMemberIds, engOnlyMemberIds } = useEngenhariaMembers();

  // Full project/client/checklist data
  const { data: full, isLoading: loadingFull } = useQuery({
    queryKey: ["planner_vendido_full", card?.id],
    enabled: !!card?.id,
    queryFn: async () => {
      const [projRes, chkRes, encCatRes, profTypeRes] = await Promise.all([
        supabase.from("projects").select(
          "id, name, focco_project_number, professional_id, responsible_id, apresentacao_projetista_id, client_id, " +
          "professionals:professional_id(id, name, consultant_id, type_id, category_id), " +
          "clients(id, name, contract_number, phone, email, cpf_cnpj, address, city, state, age, profession)"
        ).eq("id", card!.id).single(),
        supabase.from("contract_checklists").select(
          "assigned_projetista_id, assigned_logistica_id, assigned_apresentacao_projetista_id"
        ).eq("project_id", card!.id).maybeSingle(),
        supabase.from("professional_categories").select("id").ilike("name", "ENCANTADO").maybeSingle(),
        supabase.from("professional_types").select("id").order("created_at").limit(1).maybeSingle(),
      ]);
      return {
        project: projRes.data as any,
        checklist: chkRes.data as any,
        encantadoCategoryId: (encCatRes.data as any)?.id as string | undefined,
        defaultProfTypeId: (profTypeRes.data as any)?.id as string | undefined,
      };
    },
  });

  // Position members (Projetista Técnico, Analista Logística, Projetista Apresentação)
  const { data: positionMembers } = useQuery({
    queryKey: ["planner_vendido_positions"],
    queryFn: async () => {
      const { data: positions } = await supabase
        .from("positions").select("id, name").eq("is_active", true)
        .or("name.ilike.%projetista técnico%,name.ilike.%projetista tecnico%,name.ilike.%logistica%,name.ilike.%logística%,name.ilike.%projetista de apresentação%,name.ilike.%projetista apresentação%,name.ilike.%projetista apresentacao%");
      if (!positions?.length) return { projetista: [], logistica: [], apresentacao: [] };
      const proj = positions.find(p => /projetista t[eé]cnico/i.test(p.name));
      const log = positions.find(p => /log[ií]stica/i.test(p.name));
      const apre = positions.find(p => /projetista.*apresenta[cç][aã]o/i.test(p.name));
      const ids = [proj?.id, log?.id, apre?.id].filter(Boolean) as string[];
      const { data: mp } = await supabase.from("team_member_positions")
        .select("team_member_id, position_id").in("position_id", ids);
      const allIds = [...new Set((mp ?? []).map(m => m.team_member_id))];
      if (!allIds.length) return { projetista: [], logistica: [], apresentacao: [] };
      const { data: members } = await supabase.from("team_members")
        .select("id, name").in("id", allIds).eq("active", true).order("name");
      const mems = members ?? [];
      const inPos = (pid?: string) => (mp ?? []).filter(x => x.position_id === pid).map(x => x.team_member_id);
      return {
        projetista: mems.filter(m => inPos(proj?.id).includes(m.id)),
        logistica: mems.filter(m => inPos(log?.id).includes(m.id)),
        apresentacao: mems.filter(m => inPos(apre?.id).includes(m.id)),
      };
    },
  });

  const responsibleId = full?.project?.responsible_id ?? card?.responsible_id ?? null;

  // Especificadores already linked to this consultant (for autocomplete)
  const { data: profOptions = [] } = useQuery({
    queryKey: ["planner_vendido_pros", responsibleId],
    enabled: !!responsibleId,
    queryFn: async () => {
      const { data } = await supabase.from("professionals")
        .select("id, name").eq("consultant_id", responsibleId).order("name");
      return data ?? [];
    },
  });

  const needsChannelChoice = !!responsibleId && dualMemberIds.has(responsibleId);
  const inferredChannel: 'convencional' | 'engenharia' | '' =
    responsibleId && engOnlyMemberIds.has(responsibleId) ? 'engenharia'
    : responsibleId && !needsChannelChoice ? 'convencional' : '';

  // Form state
  type EspecMode = 'existing' | 'novo' | 'sem';
  const [especMode, setEspecMode] = useState<EspecMode>('existing');
  const [profId, setProfId] = useState('');
  const [novoProfName, setNovoProfName] = useState('');
  const [valor, setValor] = useState('');
  const [focco, setFocco] = useState('');
  const [contrato, setContrato] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [assignProj, setAssignProj] = useState('');
  const [assignLog, setAssignLog] = useState('');
  const [assignApre, setAssignApre] = useState('');
  const [channel, setChannel] = useState<'convencional' | 'engenharia' | ''>('');
  const [saving, setSaving] = useState(false);

  // Prefill when full loads
  useEffect(() => {
    if (!full?.project) return;
    const p = full.project;
    setFocco(p.focco_project_number ?? '');
    setContrato(p.clients?.contract_number ?? '');
    setClientName(p.clients?.name ?? card?.name ?? '');
    setClientPhone(p.clients?.phone ?? '');
    setClientEmail(p.clients?.email ?? '');
    setClientCpf(p.clients?.cpf_cnpj ?? '');
    setClientCity(p.clients?.city ?? '');
    setClientState(p.clients?.state ?? '');
    setAssignProj(full.checklist?.assigned_projetista_id ?? '');
    setAssignLog(full.checklist?.assigned_logistica_id ?? '');
    setAssignApre(full.checklist?.assigned_apresentacao_projetista_id ?? p.apresentacao_projetista_id ?? '');
    if (p.professional_id) { setEspecMode('existing'); setProfId(p.professional_id); }
    setChannel(needsChannelChoice ? '' : (inferredChannel || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full?.project?.id]);

  const handleSave = async () => {
    if (!card || !full?.project) return;
    // Validation
    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum <= 0) {
      toast({ title: 'Informe o valor da venda', variant: 'destructive' }); return;
    }
    if (!focco.trim()) { toast({ title: 'N° Projeto FOCCO obrigatório', variant: 'destructive' }); return; }
    if (!contrato.trim()) { toast({ title: 'N° Contrato obrigatório', variant: 'destructive' }); return; }
    if (!clientName.trim()) { toast({ title: 'Nome do cliente obrigatório', variant: 'destructive' }); return; }
    if (!assignProj) { toast({ title: 'Defina o Projetista Técnico', variant: 'destructive' }); return; }
    if (!assignLog)  { toast({ title: 'Defina o Analista de Logística', variant: 'destructive' }); return; }
    if (!assignApre) { toast({ title: 'Defina o Projetista de Apresentação', variant: 'destructive' }); return; }
    if (especMode === 'existing' && !profId) {
      toast({ title: 'Selecione o Especificador', description: 'Ou marque "Novo" / "Sem Especificador".', variant: 'destructive' }); return;
    }
    if (especMode === 'novo' && !novoProfName.trim()) {
      toast({ title: 'Informe o nome do Especificador', variant: 'destructive' }); return;
    }
    if (needsChannelChoice && !channel) {
      toast({ title: 'Selecione o canal da venda', variant: 'destructive' }); return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const effectiveChannel = (channel || inferredChannel || null) as 'convencional' | 'engenharia' | null;
    setSaving(true);
    try {
      // 1) Resolve professional_id (create / promote to ENCANTADO)
      let professionalId: string | null = null;
      if (especMode === 'existing') professionalId = profId || null;
      else if (especMode === 'novo') {
        // Look up existing by name + consultant first
        const { data: existing } = await supabase.from('professionals')
          .select('id').eq('consultant_id', responsibleId)
          .ilike('name', novoProfName.trim()).maybeSingle();
        if (existing?.id) professionalId = existing.id;
        else {
          const { data: novo, error: pErr } = await supabase.from('professionals').insert({
            name: novoProfName.trim(),
            consultant_id: responsibleId,
            type_id: full.defaultProfTypeId ?? null,
            category_id: full.encantadoCategoryId ?? null,
            last_action_date: today,
            is_manual_category: false,
          }).select('id').single();
          if (pErr) throw pErr;
          professionalId = novo.id;
        }
      }
      // Promote existing professional to ENCANTADO immediately
      if (professionalId && full.encantadoCategoryId) {
        await supabase.from('professionals').update({
          category_id: full.encantadoCategoryId,
          last_action_date: today,
          is_manual_category: false,
        }).eq('id', professionalId);
      }

      // 2) Update / create client
      let clientId = full.project.client_id as string | null;
      const clientPayload: any = {
        name: clientName.trim(),
        contract_number: contrato.trim() || null,
        phone: clientPhone.trim() || null,
        email: clientEmail.trim() || null,
        cpf_cnpj: clientCpf.trim() || null,
        city: clientCity.trim() || null,
        state: clientState.trim() || null,
        status: 'closed',
        professional_id: professionalId,
      };
      if (clientId) {
        await supabase.from('clients').update(clientPayload).eq('id', clientId);
      } else {
        const { data: novoCli, error: cErr } = await supabase.from('clients').insert({
          ...clientPayload,
          responsible_id: responsibleId,
        }).select('id').single();
        if (cErr) throw cErr;
        clientId = novoCli.id;
      }

      // 3) Update project
      const { error: pErr } = await supabase.from('projects').update({
        planner_status: 'VENDIDO',
        closed_value: valorNum,
        estimated_value: valorNum,
        closed_date: today,
        stage: 'closed_won',
        status: 'closed',
        focco_project_number: focco.trim(),
        professional_id: professionalId,
        apresentacao_projetista_id: assignApre || null,
        client_id: clientId,
      } as any).eq('id', card.id);
      if (pErr) throw pErr;

      // 4) Checklist (idempotent — only creates if missing)
      await createChecklistForProject(card.id, {
        assignedProjetistaId: assignProj,
        assignedLogisticaId: assignLog,
        assignedApresentacaoProjetistaId: assignApre,
        commercialResponsibleId: responsibleId ?? undefined,
      });
      // If checklist already existed, update assignees
      if (full.checklist) {
        await supabase.from('contract_checklists').update({
          assigned_projetista_id: assignProj,
          assigned_logistica_id: assignLog,
          assigned_apresentacao_projetista_id: assignApre,
        }).eq('project_id', card.id);
      }

      // 5) Create Venda action
      const { data: vendaType } = await supabase.from('action_types')
        .select('id, points, bonus_points_with_professional')
        .eq('classification', 'venda').ilike('name', 'Venda').maybeSingle();

      if (vendaType && responsibleId) {
        const { data: actionRow, error: aErr } = await supabase.from('actions').insert({
          consultant_id: responsibleId,
          professional_id: professionalId,
          action_type_id: vendaType.id,
          action_date: today,
          value: valorNum,
          client_name: clientName.trim(),
          focco_project_number: focco.trim(),
          project_id: card.id,
          notes: 'Gerada automaticamente pela mudança de card no Pipeline (VENDIDO).',
          sales_channel: effectiveChannel,
        }).select('id').single();
        if (aErr) throw aErr;

        const basePts = vendaType.points || 0;
        const bonus = (professionalId && vendaType.bonus_points_with_professional) || 0;
        const totalPts = basePts + bonus;
        if (actionRow && totalPts > 0) {
          await supabase.from('credit_transactions').insert({
            consultant_id: responsibleId,
            action_id: actionRow.id,
            professional_id: professionalId,
            points: totalPts,
            description: `Venda — ${clientName.trim()}`,
            transaction_date: today,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ['planner_kanban'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['credit_transactions'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['professionals'] });
      toast({ title: 'Venda registrada', description: 'Cliente, contrato, checklist, Programa E+ e Especificador (ENCANTADO) atualizados.' });
      onClose();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!card} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marcar como Vendido</DialogTitle>
          <DialogDescription>
            {card?.clients?.name ?? card?.name} — preencha os dados da venda. Campos já vinculados ao projeto vêm pré-preenchidos.
          </DialogDescription>
        </DialogHeader>

        {loadingFull ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando dados do projeto…
          </div>
        ) : (
        <div className="space-y-5 py-2">
          {/* Especificador */}
          <div className="space-y-2">
            <Label>Especificador *</Label>
            <RadioGroup value={especMode} onValueChange={(v) => setEspecMode(v as EspecMode)} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="existing" id="esp-ex" /><Label htmlFor="esp-ex" className="cursor-pointer">Existente</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="novo" id="esp-nv" /><Label htmlFor="esp-nv" className="cursor-pointer">Novo</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="sem" id="esp-sm" /><Label htmlFor="esp-sm" className="cursor-pointer">Sem Especificador</Label></div>
            </RadioGroup>
            {especMode === 'existing' && (
              <select value={profId} onChange={(e) => setProfId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">— Selecionar —</option>
                {profOptions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {especMode === 'novo' && (
              <>
                <Input placeholder="Nome do especificador" value={novoProfName} onChange={(e) => setNovoProfName(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Será cadastrado e promovido para a categoria ENCANTADO.</p>
              </>
            )}
          </div>

          {/* Valor + Canal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor da venda (R$) *</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            {needsChannelChoice && (
              <div className="space-y-2">
                <Label>Canal *</Label>
                <RadioGroup value={channel} onValueChange={(v) => setChannel(v as any)} className="flex gap-3 h-10 items-center">
                  <div className="flex items-center gap-1"><RadioGroupItem value="convencional" id="ch-c" /><Label htmlFor="ch-c" className="cursor-pointer text-xs">Convencional</Label></div>
                  <div className="flex items-center gap-1"><RadioGroupItem value="engenharia" id="ch-e" /><Label htmlFor="ch-e" className="cursor-pointer text-xs">Engenharia</Label></div>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Atribuir responsáveis do checklist */}
          <div className="border border-border rounded p-3 space-y-3">
            <div>
              <Label className="text-xs tracking-widest uppercase">Atribuir responsáveis do checklist *</Label>
              <p className="text-[11px] text-muted-foreground mt-1">Profissionais técnicos e de logística deste contrato.</p>
            </div>
            <div className="space-y-2">
              <Label>Projetista Técnico *</Label>
              <select value={assignProj} onChange={(e) => setAssignProj(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione um projetista</option>
                {(positionMembers?.projetista ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Analista de Logística *</Label>
              <select value={assignLog} onChange={(e) => setAssignLog(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione um analista</option>
                {(positionMembers?.logistica ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Projetista de Apresentação *</Label>
              <select value={assignApre} onChange={(e) => setAssignApre(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione um projetista</option>
                {(positionMembers?.apresentacao ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* Dados do cliente / projeto */}
          <div className="border border-border rounded p-3 space-y-3">
            <Label className="text-xs tracking-widest uppercase">Dados do cliente / projeto</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>N° Projeto FOCCO *</Label>
                <Input value={focco} onChange={(e) => setFocco(e.target.value)} placeholder="Obrigatório" />
              </div>
              <div className="space-y-2">
                <Label>N° Contrato *</Label>
                <Input value={contrato} onChange={(e) => setContrato(e.target.value)} placeholder="Obrigatório" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do cliente *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Telefone</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-1"><Label>CPF/CNPJ</Label><Input value={clientCpf} onChange={(e) => setClientCpf(e.target.value)} /></div>
              <div className="space-y-2 col-span-1"><Label>Cidade</Label><Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} /></div>
              <div className="space-y-2 col-span-1"><Label>UF</Label><Input maxLength={2} value={clientState} onChange={(e) => setClientState(e.target.value.toUpperCase())} /></div>
            </div>
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loadingFull}>
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
function ConcluidoModal({ card, isReforma, onClose }: { card: PlannerCard | null; isReforma: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [ambientes, setAmbientes] = useState("");
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
      // 1. Update project: status na pipeline + focco se informado
      const projectUpdates: any = {
        planner_status: "CONCLUIDO",
        stage: "em_negociacao",
      };
      const foccoTrim = foccoNumber.trim();
      if (foccoTrim) {
        // Verifica se o FOCCO já está vinculado a outro projeto
        const { data: existing } = await supabase
          .from("projects")
          .select("id, name")
          .eq("focco_project_number", foccoTrim)
          .maybeSingle();
        if (existing && existing.id !== card.id) {
          toast({
            title: "FOCCO já cadastrado",
            description: `O número FOCCO ${foccoTrim} já está vinculado ao projeto "${existing.name}". Use outro número ou deixe em branco.`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        projectUpdates.focco_project_number = foccoTrim;
      }

      const { error: pErr } = await supabase
        .from("projects")
        .update(projectUpdates)
        .eq("id", card.id);
      if (pErr) throw pErr;

      // 2. Find action type (Reforma OR padrão)
      const actionTypeName = isReforma
        ? "Reforma - Projeto de apresentação"
        : "Projeto de Apresentação";
      const { data: actionType } = await supabase
        .from("action_types")
        .select("id, points")
        .eq("classification", "projeto")
        .ilike("name", actionTypeName)
        .maybeSingle();

      if (!actionType) {
        toast({ title: "Tipo de ação não encontrado", description: `Configure '${actionTypeName}' nos tipos de ação.`, variant: "destructive" });
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
          value: null,
          client_name: card.clients?.name ?? null,
          focco_project_number: foccoNumber.trim() || null,
          project_id: card.id,
          notes: `Gerada automaticamente pela mudança de card no Pipeline (CONCLUIDO${isReforma ? " - REFORMA" : ""}).`,
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
          description: `${isReforma ? "Reforma - Projeto de apresentação" : "Projeto de Apresentação"} — ${card.clients?.name ?? card.name} (${ambCount} amb.)`,
          transaction_date: today,
        });

      }

      qc.invalidateQueries({ queryKey: ["planner_kanban"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["actions"] });
      qc.invalidateQueries({ queryKey: ["credit_transactions"] });
      qc.invalidateQueries({ queryKey: ["project-environments"] });
      toast({ title: "Apresentação concluída", description: `${ambCount} ambiente(s) registrados no Programa E+.` });
      setAmbientes(""); setFoccoNumber("");
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
          <DialogTitle>Marcar como Concluído{isReforma ? " (Reforma)" : ""}</DialogTitle>
          <DialogDescription>
            {card?.clients?.name ?? card?.name} — {isReforma ? "Reforma - Projeto de apresentação" : "Projeto de Apresentação"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Quantidade de ambientes *</Label>
            <Input type="number" min="1" value={ambientes} onChange={(e) => setAmbientes(e.target.value)} placeholder="Ex: 3" />
            <p className="text-[11px] text-muted-foreground">1 ambiente = 1 ponto no Programa E+ para o projetista.</p>
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
function Card({ card, onEdit, onDelete }: { card: PlannerCard; onEdit: (c: PlannerCard) => void; onDelete: (c: PlannerCard) => void }) {
  const days = card.planner_status_at
    ? Math.max(0, Math.floor((Date.now() - new Date(card.planner_status_at).getTime()) / 86400000))
    : null;
  const isFinal = card.planner_status === "VENDIDO" || card.planner_status === "PERDIDO";
  const isCritical =
    days !== null &&
    ((card.planner_status === "CONCLUIDO" && days >= 10) ||
      (card.planner_status === "AGUARDANDO_INICIO" && days >= 15));
  const isLate = days !== null && days > 10 && !isFinal && !isCritical;
  const showProjetista =
    card.planner_status === "INICIADO" ||
    card.planner_status === "CONCLUIDO" ||
    card.planner_status === "PERDIDO" ||
    card.planner_status === "VENDIDO";
  return (
    <div
      onClick={() => onEdit(card)}
      className={`border rounded p-3 space-y-2 transition-colors cursor-pointer ${
        isCritical
          ? "bg-red-600/80 border-red-400 hover:bg-red-600"
          : "bg-neutral-900 border-white/10 hover:border-white/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-white truncate">
          {card.clients?.name || card.name}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ClienteHistoryButton clientId={card.client_id} variant="icon" />
        {days !== null && !isFinal && (
          <span
            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
              isCritical
                ? "bg-red-500/15 text-red-400 border border-red-500/40"
                : isLate
                ? "bg-amber-400/15 text-amber-400 border border-amber-400/40"
                : "bg-white/5 text-white/50 border border-white/10"
            }`}
            title={`Nesta coluna há ${days} dia(s) corridos`}
          >
            <Clock className="h-3 w-3" />
            {days} dc
          </span>
        )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(card); }}
            title="Excluir card"
            className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
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
      {isSafeHttpUrl(card.planner_link) && (
        <a
          href={safeHref(card.planner_link)}
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
    if (link.trim() && !isSafeHttpUrl(link)) {
      toast({ title: "Link inválido", description: "Use http(s)://", variant: "destructive" });
      return;
    }
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
              Define a partir de qual dia o contador "dias na coluna" (dc — dias corridos) deve começar.
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
  const [concluidoCard, setConcluidoCard] = useState<{ card: PlannerCard; isReforma: boolean } | null>(null);
  const [editCard, setEditCard] = useState<PlannerCard | null>(null);
  const [deleteCard, setDeleteCard] = useState<PlannerCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revertConfirm, setRevertConfirm] = useState<{
    card: PlannerCard;
    dest: PlannerStatus;
    from: PlannerStatus;
  } | null>(null);
  const [managerApproval, setManagerApproval] = useState<{
    card: PlannerCard;
    dest: PlannerStatus;
  } | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const { user } = useAuthContext();

  const grouped = COLUMNS.reduce((acc, col) => {
    const list = cards.filter((c) => {
      if (c.planner_status !== col.id) return false;
      return true;
    });
    if (col.id === "AGUARDANDO_INICIO") {
      // Mais novos no topo, mais antigos no fim (ordem por data de entrada na coluna).
      list.sort((a, b) => {
        const da = new Date(a.planner_data_aguardando || a.planner_status_at || 0).getTime();
        const db = new Date(b.planner_data_aguardando || b.planner_status_at || 0).getTime();
        return db - da;
      });
    }
    acc[col.id] = list;
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

    // AGUARDANDO_INICIO → INICIADO: apenas o card mais antigo (último na coluna) pode iniciar
    // sem aprovação. Qualquer outro exige liberação da Gerência (admin).
    if (src === "AGUARDANDO_INICIO" && dest === "INICIADO") {
      const fila = grouped["AGUARDANDO_INICIO"];
      const oldest = fila[fila.length - 1];
      if (oldest && oldest.id !== card.id) {
        setManagerApproval({ card, dest });
        return;
      }
    }

    // CONCLUIDO → EM_REFORMA: preserva ação, pontos e ambientes da apresentação original.
    // Apenas atualiza o status; ao voltar para CONCLUIDO (vindo de EM_REFORMA) será criada
    // uma NOVA ação "Reforma - Projeto de apresentação" com novos pontos/ambientes.
    if (src === "CONCLUIDO" && dest === "EM_REFORMA") {
      upd.mutate({ id: draggableId, status: dest });
      return;
    }

    // Reverter de VENDIDO/PERDIDO/CONCLUIDO precisa de confirmação e limpeza.
    // Avanços naturais (CONCLUIDO → VENDIDO/PERDIDO/EM_REFORMA) NÃO são reversões.
    const isRevert =
      src === "VENDIDO" ||
      src === "PERDIDO" ||
      (src === "CONCLUIDO" && (dest === "AGUARDANDO_INICIO" || dest === "INICIADO"));
    if (isRevert) {
      setRevertConfirm({ card, dest, from: src });
      return;
    }

    if (dest === "VENDIDO") { setVendidoCard(card); return; }
    if (dest === "PERDIDO") { setPerdidoCard(card); return; }
    if (dest === "CONCLUIDO") { setConcluidoCard({ card, isReforma: src === "EM_REFORMA" }); return; }

    upd.mutate({ id: draggableId, status: dest });
  };

  const handleRequestApproval = async () => {
    if (!managerApproval || !user) return;
    setSubmittingRequest(true);
    try {
      // Localiza team_member do solicitante (opcional)
      const { data: tm } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const { error } = await supabase.from("planner_start_approvals").insert({
        project_id: managerApproval.card.id,
        requested_by_user_id: user.id,
        requested_by_team_member_id: tm?.id ?? null,
        reason: approvalReason.trim() || null,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Já existe uma solicitação pendente para este card" });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Solicitação enviada",
          description: "A Gerência Comercial receberá a notificação. O card será movido automaticamente quando aprovado.",
        });
      }
      setManagerApproval(null);
      setApprovalReason("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRevert = async () => {
    if (!revertConfirm) return;
    const { card, dest, from } = revertConfirm;
    try {
      const projectUpdates: any = {
        planner_status: dest,
        stage: dest === "CONCLUIDO" || dest === "INICIADO" || dest === "AGUARDANDO_INICIO" || dest === "EM_REFORMA"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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
                    {avgDaysByColumn[col.id] !== null && (
                      <div className="flex items-center gap-1 px-1 pb-2 text-[10px] text-white/50">
                        <Clock className="h-3 w-3" />
                        <span>Tempo médio: {avgDaysByColumn[col.id]}d</span>
                      </div>
                    )}
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
                              <Card card={card} onEdit={setEditCard} onDelete={setDeleteCard} />
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
      <ConcluidoModal card={concluidoCard?.card ?? null} isReforma={!!concluidoCard?.isReforma} onClose={() => setConcluidoCard(null)} />
      <EditCardModal card={editCard} onClose={() => setEditCard(null)} />

      <AlertDialog open={!!deleteCard} onOpenChange={(b) => !b && setDeleteCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir card do Pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto <strong>{deleteCard?.clients?.name || deleteCard?.name}</strong> será removido do Pipeline e excluído.
              Ações vinculadas (registros de venda, apresentação) serão desvinculadas, não excluídas.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteCard) return;
                setDeleting(true);
                try {
                  // Desvincular ações vinculadas (preserva histórico)
                  await supabase.from("actions").update({ project_id: null }).eq("project_id", deleteCard.id);
                  // Remover ambientes/históricos do projeto
                  await supabase.from("project_environments").delete().eq("project_id", deleteCard.id);
                  await supabase.from("project_value_history").delete().eq("project_id", deleteCard.id);
                  const { error } = await supabase.from("projects").delete().eq("id", deleteCard.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: ["planner_kanban"] });
                  qc.invalidateQueries({ queryKey: ["projects"] });
                  qc.invalidateQueries({ queryKey: ["actions"] });
                  toast({ title: "Card excluído" });
                  setDeleteCard(null);
                } catch (err: any) {
                  toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
                } finally {
                  setDeleting(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <Dialog
        open={!!managerApproval}
        onOpenChange={(b) => {
          if (!b) { setManagerApproval(null); setApprovalReason(""); }
        }}
      >
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>Liberação da Gerência necessária</DialogTitle>
            <DialogDescription>
              O card <strong>{managerApproval?.card.clients?.name || managerApproval?.card.name}</strong> não é o mais antigo da fila
              <strong> Aguardando Início</strong>. Envie a solicitação para a <strong>Gerência Comercial</strong> aprovar dentro do sistema.
              O card será movido automaticamente para <strong>Iniciado</strong> quando a solicitação for aprovada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Ex.: cliente com urgência, projeto prioritário…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setManagerApproval(null); setApprovalReason(""); }}
              disabled={submittingRequest}
            >
              Cancelar
            </Button>
            <Button onClick={handleRequestApproval} disabled={submittingRequest}>
              {submittingRequest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Solicitar liberação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
