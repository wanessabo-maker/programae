import { PlannerTab } from "@/components/comercial/PlannerTab";

export default function PlannerApresentacao() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">PLANNER APRESENTAÇÃO</h1>
        <p className="text-xs text-muted-foreground tracking-wide">
          Acompanhamento dos projetos por status — Aguardando · Iniciado · Concluído · Vendido · Perdido
        </p>
      </div>
      <PlannerTab />
    </div>
  );
}
