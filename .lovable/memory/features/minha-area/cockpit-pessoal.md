---
name: Cockpit pessoal da Minha Área
description: Minha Área em 5 blocos — card MEU MUNDO com + Registrar Ação, Minhas Metas (semana + barra do mês), Minhas Ações, Meus Contratos, Pipeline destacado e Indicadores mês a mês
type: feature
---
A Minha Área é a primeira tela do colaborador e funciona como cockpit pessoal ("meu mundo"). Sem título "Olá, X" nem subtítulo de atividades na visão pessoal.

Ordem fixa da página:

- **MEU MUNDO** (card do topo) — semana corrente, % da meta da semana com semáforo, "Foco de hoje" (até 3 prioridades) e o botão **+ Registrar Ação** no canto superior direito.
- **1 · Minhas Metas** — uma única categoria por meta (Valor vendido, Ações, Captações, Projetos): valor da semana + previsto + % + quanto falta, e abaixo a barra "Objetivo do mês". Metas somente leitura, vindas do Setup → Metas. Meta semanal = mensal ÷ nº de semanas do mês. Semáforo: verde ≥100%, amarelo ≥70%, vermelho <70%.
- **Meus Alertas** — apenas dois: especificadores esfriando (saindo de Curioso/Encantado) e projetos parados 15dc+.
- **2 · Minhas Ações** — histórico das ações registradas pelo colaborador.
- **3 · Meus Contratos** — contratos ativos com o checklist, atrasados no topo.
- **4 · Pipeline de Apresentações** — PlannerTab com os projetos do colaborador destacados.
- **5 · Meus Indicadores** — tabela mês a mês do ano (Vendido, Captações, Ações) + total.

Removidos: bloco "Minha Semana" (Prospecção/Relacionamento/Carteira/Briefing/Apresentações), alerta de briefings pendentes e o check-in de tempo manhã/tarde (`daily_time_blocks` permanece no banco, sem uso nesta tela).

Consultor vê apenas os próprios dados (filtro por `team_member_id`); gestor/admin mantém a visão geral (aba Gestora / Toda Equipe).
