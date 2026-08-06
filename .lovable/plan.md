# Atualizar metas de Ago–Dez/2026 no Setup

As metas do 2º semestre já existem no Setup para os 4 consultores (vendas, ações, captações), para o time (ambientes 200/mês) e para o Canal Engenharia (zerado). Portanto não é preciso criar nada novo: basta **substituir os valores** pelos números novos enviados.

## O que muda

**Vendas (Meta / Big Meta)**
- Victor: Ago 385.000/525.000, Set 420.000/560.000, Out 455.000/630.000, Nov 420.000/560.000, Dez 245.000/350.000
- Ju: valores idênticos aos do Victor (hoje estão diferentes: 374.000/510.000 etc.)
- Lourival e Camila: já estão exatamente com os valores novos — sem alteração

**Ações com especificador**
- Victor: 22 / 20 / 22 / 22 / 15 (hoje Out 23, Nov 23, Dez 16)
- Ju: 22 / 20 / 22 / 22 / 15 (hoje 21 / 19 / 22 / 22 / 15)
- Lourival: 10 / 9 / 11 / 11 / 8 (hoje 11 / 10 / 11 / 11 / 7)
- Camila: 8 / 7 / 9 / 9 / 6 (hoje 8 / 7 / 8 / 8 / 6)

**Captações**
- Victor: 8 / 10 / 11 / 9 / 6 — confirmar Dez
- Ju: 8 / 10 / 11 / 9 / 6 (hoje 7 / 10 / 10 / 9 / 5)
- Lourival: 3 / 5 / 5 / 5 / 2 (hoje 4 / 5 / 5 / 4 / 3)
- Camila: 3 / 3 / 3 / 3 / 2 (hoje 3 / 3 / 4 / 4 / 2)

**Projetos · Ambientes (time)**: 200 por mês — já correto, sem alteração.

**Canal Engenharia**: permanece zerado em vendas, ações e captações — sem alteração.

## Detalhes técnicos

- Uma única atualização de dados na tabela `goals`, por `team_member_id` + `metric` + `start_date` (períodos mensais de Ago a Dez/2026).
- Nenhuma linha nova é criada e nenhuma linha é apagada; metas de `categoria` (% Encantado/Curioso/Distante) ficam intactas.
- Nada de indicadores/pontos é recalculado — só as metas de referência mudam.
