# Minha Área — cockpit enxuto em 5 blocos

Reorganização da página, sem mudanças de banco.

## Topo da página

- Remove o título "Olá, Wanessa" duplicado e a frase "Atividades liberadas para sua execução e aguardando liberação de outras áreas".
- A página começa pelo card **MEU MUNDO** (semana + % da meta + Foco de hoje), com o botão **+ Registrar Ação** no canto superior direito do próprio card.
- O banner "Atenção à meta" e o aviso de projetos parados continuam logo abaixo.

## 1 · Minhas Metas

- Título sem "(definidas no Setup)".
- Uma única categoria por meta (fim das duplas Mês/Semana). Cada card mostra:

```text
VALOR VENDIDO — SEMANA                        (semáforo)
R$ 120.000        de R$ 275.000 previstos   ·  44%
Faltam R$ 155.000 nesta semana
------------------------------------------------------
OBJETIVO DO MÊS   [=========_____________]  R$ 480.000 / R$ 1.100.000  (44%)
```

- Mesma dinâmica para: Valor vendido, Ações, Captações e Projetos (quando aplicável).

## Meus Alertas

Somente dois cartões:
- Especificadores esfriando (saindo de Encantado/Curioso)
- Projetos parados (15dc+)

Remove o bloco "Minha Semana" (Prospecção, Relacionamento, Carteira, Briefing, Apresentações) e o alerta de Briefings pendentes.

## 2 · Minhas Ações

Lista das ações registradas pelo colaborador (como hoje), sem o botão de registrar — ele passa para o topo da página.

## 3 · Meus Contratos

Contratos ativos do colaborador com as etapas de checklist, atrasados no topo e contagem de etapas em atraso em destaque (é o bloco que hoje se chama "Minhas Pendências").

## 4 · Pipeline de Apresentações — seus projetos em destaque

Mantido como está, apenas renumerado.

## 5 · Meus Indicadores — mês a mês (2026)

Tabela anual do colaborador, no estilo do Dashboard: uma linha por mês (Jan…Dez) com **Vendido (R$)**, **Captações** e **Ações**, mais linha de total do ano. Substitui a visão de mês único com setas.

## Detalhes técnicos

- `src/pages/MinhaArea.tsx`: remove subtítulo e o `h1` "Olá,"; passa `+ Registrar Ação` para o `MeuCockpit` (ou header do bloco 1); renumera as seções (2 Minhas Ações, 3 Meus Contratos, 4 Pipeline, 5 Meus Indicadores) e reordena para essa sequência.
- `src/components/minha-area/MeuCockpit.tsx`: novo `MetaCard` unificado (semana + barra do objetivo do mês); remove a seção "Minha Semana" e os `BlocoCard`s; alertas reduzidos a dois; recebe prop para renderizar o botão de registrar ação.
- `src/components/minha-area/MeuCaminho.tsx`: fica só com a lista de ações (bloco 2) e o Pipeline vira bloco 4 separado; o botão de ação sai do componente.
- Novo `src/components/minha-area/MeusIndicadoresAnuais.tsx`: agrega `useActions` do colaborador por mês do ano corrente (vendido = soma de valores de ações de venda, captações = ações que impactam captação, ações = total) e renderiza a tabela; substitui o uso de `IndicadoresTab` na Minha Área.
- Sem migrações, sem alteração de RLS e sem impacto nas abas Gestora / Toda Equipe.
