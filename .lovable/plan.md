# Foco do Dia no topo da Minha Área

Substituir o card de check-in Manhã/Tarde (Atividade-fim / Operacional) por um card
**Foco do Dia**: as 3 ações mais importantes para o colaborador bater a meta da semana.

## O que muda na tela

O card branco no topo passa a ter:

- Saudação e período da semana (mantido, à esquerda).
- À direita, no lugar do "% tempo em atividade-fim": o **% da meta da semana** já atingido,
  com semáforo verde / amarelo / vermelho.
- Abaixo, **até 3 cartões de foco** numerados, cada um com: título da tarefa, o motivo
  (o dado que gerou a sugestão) e um rótulo de urgência.

```text
MEU MUNDO                                        META DA SEMANA
WANESSA, SUA SEMANA                                        62%
03 de ago — 09 de ago

FOCO DE HOJE
1  Retomar 3 projetos parados      ANDRÉ 22dc · LUCAS 18dc     urgente
2  Falar com 2 especificadores     ANA esfriou · JOÃO 4dc      atenção
3  Faltam R$ 180.000 na meta       registre a venda ao fechar  meta
```

## Como as 3 sugestões são escolhidas

Prioridade, de cima para baixo, usando apenas dados já existentes do próprio colaborador:

1. **Projetos parados** — cards do pipeline dele com 15dc ou mais sem movimentação.
2. **Especificadores esfriando** — já expirados ou com 7dc ou menos de validade.
3. **Briefings pendentes** — projetos em Concluído aguardando dados.
4. **Gap de meta da semana** — valor vendido, ações ou captações abaixo do ritmo.

Se nada estiver pendente, o card mostra "Semana em dia" e reforça o caminho:
registrar ações em "+ Registrar Ação".

Cada foco tem um botão que leva ao bloco correspondente da página (pipeline, ações,
pendências) — sem criar telas novas.

## Detalhes técnicos

- Editar `src/components/minha-area/MeuCockpit.tsx`: remover o bloco de check-in
  (`daily_time_blocks`) e o indicador de tempo em atividade-fim; inserir no lugar a lista
  de focos, derivada dos cálculos já existentes no arquivo (`carteira`, `projetosParados`,
  `esfriando`, `briefings`, `metaSemana`, `realizado`).
- O hook `src/hooks/useTimeBlocks.ts` e a tabela `daily_time_blocks` permanecem no projeto,
  apenas deixam de ser usados nesta tela (sem migração, sem perda de histórico).
- O banner "Atenção à meta" continua logo abaixo do card.
- Nenhuma alteração nos blocos 2, 3 e 4 nem em outras páginas.