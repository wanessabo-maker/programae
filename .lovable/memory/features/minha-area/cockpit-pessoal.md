---
name: Cockpit pessoal da Minha Área
description: Minha Área é o cockpit do colaborador — Minha Meta (mês/semana), Minha Semana, autogestão de tempo (check-in manhã/tarde, meta 60% atividade-fim) e Meus Alertas
type: feature
---
A Minha Área é a primeira tela do colaborador e funciona como cockpit pessoal ("meu mundo"):

- **Minha Meta** — somente leitura, sempre vinda do Setup → Metas (nunca recadastrar na Minha Área). Meta semanal = meta mensal ÷ nº de semanas do mês. Semáforo: verde ≥100%, amarelo ≥70%, vermelho <70%. Abaixo de 70% exibe aviso "Atenção à meta".
- **Minha Semana** — blocos Prospecção (ações que impactam captação), Relacionamento/Ações (prioriza especificadores esfriando por dias restantes), Carteira Flutuante (projetos ativos no pipeline com dias parados), Briefing (projetos em CONCLUIDO) e Apresentações/Fechamentos (INICIADO + vendas da semana). Nada é registrado aqui: a alimentação vem de "+ Registrar Ação" e do Pipeline.
- **Autogestão de tempo** — tabela `daily_time_blocks` (colaborador, data, período manhã/tarde, tipo atividade_fim/operacional). % de tempo em atividade-fim da semana no topo, meta 60%.
- **Meus Alertas** — especificadores esfriando (expirados ou ≤7d), projetos parados 15d+, briefings pendentes.

Consultor vê apenas os próprios dados (filtro por `team_member_id`); gestor/admin mantém a visão geral (aba Gestora / Toda Equipe).