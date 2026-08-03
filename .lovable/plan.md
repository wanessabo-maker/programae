# Separar Gestão da Minha Área

Hoje a Minha Área mistura duas coisas: o cockpit pessoal do colaborador e a visão de gestão
(abas Atividades/Gestora, toggle Minhas Atividades / Toda Equipe, painel de limpeza).
Para quem não é gestor esses controles aparecem sem função e poluem a tela.

## Sugestão

Separar em duas páginas distintas:

- **Minha Área** (`/minha-area`) — só o "meu mundo": MEU MUNDO, Minhas Metas, Alertas,
  Minhas Ações, Meus Contratos, Pipeline destacado, Meus Indicadores. Sem abas,
  sem toggle de equipe, sem painéis administrativos. Igual para todos, inclusive admin.
- **Gestão** (`/gestao`, novo item de menu) — visível apenas para admin e para cargos de
  gerência. Reúne tudo o que hoje vive nas abas e no modo equipe:
  - Visão Geral da Equipe (checklists de toda a equipe + filtro por colaborador)
  - Gestora (funil do mês, alertas operacionais) — só admin
  - Indicadores por colaborador (ManagementDashboard + Indicadores Comercial)
  - Painel de limpeza da loja em tempo real — só admin

```text
Menu:  Minha Área | Dashboard | Comercial | Projetos | CS & AT | Programa E+ | Gestão* | Usuários*
                                                                        (* só admin/gerência)
```

Assim o colaborador comum vê apenas a própria área, e o gestor troca de contexto de forma
explícita pelo menu — sem abas escondidas dentro da página pessoal.

## Regras de acesso

- `/gestao`: admin **ou** colaborador com cargo contendo "gerência/gerente".
- Não-admin com cargo de gerência: vê Visão Geral da Equipe e Indicadores; não vê
  Gestora nem o painel de limpeza.
- Quem não tem permissão e acessa a URL é redirecionado para `/minha-area`.

## Detalhes técnicos

- Novo `src/pages/Gestao.tsx`: move para lá o conteúdo hoje renderizado em
  `activeTab === 'gestora'` e o modo `viewMode === 'team'` de `MinhaArea.tsx`
  (agrupamento de checklists da equipe, filtro `teamFilterMemberId`,
  `GestoraDashboard`, `ManagementDashboard`, `IndicadoresTab`, `CleanlinessAdminPanel`).
- `src/pages/MinhaArea.tsx`: remove `Tabs`, `activeTab`, `viewMode`, `teamFilterMemberId`,
  `useAllTeamChecklistItems`, header condicional e `CleanlinessAdminPanel`. Fica somente o
  fluxo pessoal já existente (`MeuCockpit`, `MeuCaminho`, contratos, `PlannerTab`,
  `MeusIndicadoresAnuais`, seções de projetista).
- `src/App.tsx`: nova rota protegida `/gestao` com guarda admin-ou-gerência
  (mesma lógica de cargos já usada em `MinhaArea` via `usePositions().getMemberPositions`),
  redirecionando para `/minha-area` quando sem permissão.
- `src/components/Layout.tsx`: adiciona `{ path: '/gestao', label: 'Gestão' }` ao menu apenas
  quando o usuário tem essa permissão, e inclui `/gestao` no mapa de rotas permitidas.
- Sem migrações e sem mudanças de RLS — apenas reorganização de telas.