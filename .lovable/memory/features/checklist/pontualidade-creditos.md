---
name: Créditos de pontualidade do checklist
description: Regras de pontos E+ por etapa de checklist concluída no prazo (2 pts) e bônus colaborativo de fechamento (+10 pts por responsável distinto)
type: feature
---
- Gatilho: etapa passa para status 'completed' em `useCompleteChecklistItem` (src/hooks/useChecklist.ts).
- Pontualidade: DATA de completed_at <= due_date (due_date nulo = no prazo) → 2 pts. Atraso → 0.
- Beneficiário: `assigned_to` da etapa; se nulo, `completed_by`.
- Gravação em `credit_transactions`: points=2, consultant_id=beneficiário, transaction_date=data da conclusão, checklist_item_id=id da etapa, status='active', description `Checklist no prazo: <nome da etapa>`.
- Validade mensal: expires_at = último dia do mês de transaction_date.
- Idempotência: `credit_transactions` não tem coluna de categoria, então a checagem é por checklist_item_id **+ prefixo da description** (o mesmo item também pode ter o crédito de ambientes do projetista, cuja description começa com o nome do template).
- Bônus de fechamento: todas as etapas 'completed'/'skipped' e nenhuma com atraso → +10 pts para cada `assigned_to` distinto, description `Bônus checklist 100% no prazo`. Idempotência via `contract_checklists.closing_bonus_awarded` (boolean default false).
