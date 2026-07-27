import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_INICIO: "Aguardando Início",
  INICIADO: "Iniciado",
  CONCLUIDO: "Concluído",
  EM_REFORMA: "Em Reforma",
  VENDIDO: "Vendido",
  PAUSADO: "Pausado",
  PERDIDO: "Perdido",
};

const ORDER = ["AGUARDANDO_INICIO", "INICIADO", "CONCLUIDO", "EM_REFORMA", "VENDIDO", "PAUSADO", "PERDIDO"];

export interface PipelineExportCard {
  id: string;
  name: string;
  planner_status: string | null;
  planner_observacao: string | null;
  planner_link: string | null;
  planner_motivo_perda: string | null;
  closed_value: number | null;
  closed_date: string | null;
  planner_status_at: string | null;
  planner_data_aguardando: string | null;
  origin_type: string | null;
  clients?: { id: string; name: string } | null;
  responsible?: { id: string; name: string } | null;
  apresentacao_projetista?: { id: string; name: string } | null;
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");
const daysIn = (d?: string | null) =>
  d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : "";

export function PipelineExportButton({ cards }: { cards: PipelineExportCard[] }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const XLSX = await import("xlsx");

      const sorted = [...cards].sort(
        (a, b) =>
          ORDER.indexOf(a.planner_status ?? "") - ORDER.indexOf(b.planner_status ?? "") ||
          (a.clients?.name ?? a.name).localeCompare(b.clients?.name ?? b.name)
      );

      const rows = sorted.map((c) => ({
        "Etapa": STATUS_LABEL[c.planner_status ?? ""] ?? c.planner_status ?? "",
        "Cliente": c.clients?.name ?? "",
        "Projeto": c.name,
        "Consultor": c.responsible?.name ?? "",
        "Projetista de Apresentação": c.apresentacao_projetista?.name ?? "",
        "Origem": c.origin_type ?? "",
        "Dias na etapa (dc)": daysIn(c.planner_status_at),
        "Entrada na etapa": fmtDate(c.planner_status_at),
        "Entrada na fila": fmtDate(c.planner_data_aguardando),
        "Valor fechado": c.closed_value ?? "",
        "Data da venda": fmtDate(c.closed_date),
        "Motivo da perda": c.planner_motivo_perda ?? "",
        "Observação": c.planner_observacao ?? "",
        "Link": c.planner_link ?? "",
      }));

      const resumo = ORDER.map((s) => {
        const list = cards.filter((c) => c.planner_status === s);
        const withDate = list.filter((c) => c.planner_status_at);
        const media = withDate.length
          ? Math.round(
              (withDate.reduce(
                (sum, c) => sum + Math.floor((Date.now() - new Date(c.planner_status_at!).getTime()) / 86400000),
                0
              ) /
                withDate.length) *
                10
            ) / 10
          : 0;
        return {
          "Etapa": STATUS_LABEL[s],
          "Projetos": list.length,
          "Média de dias na etapa (dc)": media,
          "Valor total fechado": list.reduce((sum, c) => sum + (c.closed_value ?? 0), 0),
        };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Pipeline");

      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      XLSX.writeFile(wb, `Pipeline_Apresentacoes_${stamp}.xlsx`);
      toast({ title: "Relatório gerado", description: `${rows.length} projetos exportados.` });
    } catch (e: any) {
      toast({ title: "Erro ao gerar relatório", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} size="sm" variant="outline" disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {loading ? "Gerando..." : "Gerar Relatório"}
    </Button>
  );
}
