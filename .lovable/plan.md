# Minha Área como guia de atividades

A dinâmica proposta faz sentido e encaixa no que já existe. Hoje a Minha Área já tem cockpit (metas, semana, check-in de tempo), seções por cargo e a lista de contratos/checklist. A mudança é de **ordem e narrativa**: a página passa a ter 4 blocos numerados na sequência meta → caminho → indicadores → pendências, sem inventar dados novos.

## Estrutura final da página (colaborador)

```text
[Banner de atenção à meta — só quando amarelo/vermelho]

1  MINHAS METAS         mês | semana | realizado | % | falta | semáforo
2  O CAMINHO            [+ REGISTRAR AÇÃO] · Minhas ações registradas
                        Pipeline de Apresentações (meus projetos destacados)
3  MEUS INDICADORES     indicadores mês a mês já existentes, filtrados em mim
4  MINHAS PENDÊNCIAS    contratos + etapas do checklist, atrasadas no topo
```

Gestor/admin mantém as abas atuais (visão de equipe, Gestora, painel de limpeza).

## Bloco 1 — Minhas Metas
- Metas somente leitura vindas do Setup, apenas do próprio colaborador; a semanal é derivada da mensal quando não houver meta semanal cadastrada.
- Por área: Comercial (Valor Vendido, Ações, Captações), Projetos (projetos/ambientes e prazo), CS & AT (prazo de assistências/satisfação).
- Cada meta mostra realizado, % atingido, quanto falta e semáforo verde/amarelo/vermelho.
- Lembrete de atenção à meta no topo sempre que alguma meta estiver fora do ritmo.
- O check-in diário de tempo (manhã/tarde, meta 60% atividade-fim) continua neste bloco.

## Bloco 2 — O caminho
- Botão "+ Registrar Ação" em destaque, abrindo o modal de ação já existente.
- "Minhas ações registradas": histórico recente do colaborador com tipo de ação, especificador/projeto, data e valor quando houver.
- Pipeline de Apresentações completo embutido, com os cards do colaborador em cor destacada.

## Bloco 3 — Meus indicadores
- Reaproveita os indicadores por colaborador mês a mês (valor vendido, captação, ações), travados no colaborador logado, sem seletor de outra pessoa.

## Bloco 4 — Minhas pendências
- Contratos ativos do colaborador com as etapas do checklist, ordenados por atraso.
- Cada etapa exibe prazo e dias de atraso, com aviso claro do que precisa ser concluído; concluir etapa segue pelo modal atual.

## Detalhes técnicos
- Reorganizar `src/pages/MinhaArea.tsx` nos 4 blocos, extraindo componentes em `src/components/minha-area/` (`MinhasMetas`, `MeuCaminho`, `MeusIndicadores`, `MinhasPendencias`), reaproveitando a lógica de `MeuCockpit.tsx`.
- Metas: mesma leitura do `SetupContext` (filtro por `team_member_id` + vigência), com derivação semanal pelo número de semanas do mês.
- Ações: `useActions` filtrado por `consultant_id`; modal `ActionModal`.
- Pipeline: reutilizar `PlannerTab` com uma prop opcional de destaque (`highlightMemberId`), sem alterar o comportamento no Comercial.
- Indicadores: reutilizar `IndicadoresTab` com o colaborador fixado.
- Pendências: hooks `useMyAllChecklistItems` e o agrupamento por contrato já existentes.
- Incremental: sem migrações de banco, sem mudança de RLS e sem alterar as telas de Comercial/Projetos.