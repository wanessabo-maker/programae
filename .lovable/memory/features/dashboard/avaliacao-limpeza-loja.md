---
name: Avaliação Limpeza da Loja
description: Barra semanal no Dashboard com nota 0–5 sobre limpeza da loja, vista em tempo real pelo admin em Minha Área
type: feature
---
Tabela `store_cleanliness_checks` (team_member_id, rating 0-5, week_start, checked_at) com unique (team_member_id, week_start) garante 1 avaliação por colaborador por semana ISO (segunda a domingo). RLS: leitura para autenticados, escrita restrita ao próprio team_member ou admin. Realtime habilitado via supabase_realtime publication.

- Componente `CleanlinessCheckBar` (Dashboard, todos os usuários): pergunta "Como anda a limpeza da loja hoje:" com botões 0–5; permite atualizar a nota da semana.
- Componente `CleanlinessAdminPanel` (Minha Área, somente admin, no topo): exibe média da semana, total de respostas, pendentes e lista em tempo real (subscribe via supabase channel).
- Hook `useStoreCleanliness` expõe `useMyWeeklyCleanlinessCheck`, `useSubmitCleanlinessCheck`, `useWeeklyCleanlinessList`, e `getCurrentWeekStart` (segunda ISO).
