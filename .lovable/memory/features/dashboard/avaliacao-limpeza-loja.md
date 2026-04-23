---
name: Avaliação Limpeza da Loja
description: Barra semanal no Dashboard com nota 0–5 sobre limpeza da loja, vista em tempo real pelo admin em Minha Área
type: feature
---
Tabela `store_cleanliness_checks` (team_member_id, rating 0-5, notes, photos text[], week_start, checked_at) com unique (team_member_id, week_start) garante 1 avaliação por colaborador por semana ISO (segunda a domingo). RLS: leitura para autenticados, escrita restrita ao próprio team_member ou admin. Realtime habilitado via supabase_realtime publication. Bucket público `cleanliness-photos` armazena fotos em pastas por team_member_id.

- Componente `CleanlinessCheckBar` (Dashboard): slider 0-5; quando nota < 4, exibe campos opcionais de observação (até 500 chars) e upload de até 5 fotos para o bucket `cleanliness-photos`.
- Componente `CleanlinessAdminPanel` (Minha Área, admin no topo): exibe média semana/mês, respostas, pendentes, distribuição por faixas, lista em tempo real com observação/fotos, e ações de editar/excluir para admins.
- Hook `useStoreCleanliness`: `useMyWeeklyCleanlinessCheck`, `useSubmitCleanlinessCheck` (aceita `{ rating, notes?, photos? }` ou número simples), `useWeeklyCleanlinessList` (faz join manual com team_members em JS porque a tabela não tem FK declarada), `useMonthlyCleanlinessList`, `useUpdateCleanlinessCheck`, `useDeleteCleanlinessCheck`, `getCurrentWeekStart` (segunda ISO).
