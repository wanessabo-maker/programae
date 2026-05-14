## Objetivo

Expor via API REST (com chave secreta) os dados da etapa **3 — "E-mail formal enviado ao financeiro"** do checklist de contratos, incluindo 3 campos novos: **Fluxo de pagamento**, **Comprovante de entrada** e **Solicitação de boletos**.

## 1. Banco de dados

**Migration:** adicionar coluna `extra_data jsonb` em `checklist_items` (genérico, reutilizável em outras etapas no futuro).

Para a etapa 3, o JSON armazenará:
```json
{
  "payment_flow": "texto livre - fluxo de pagamento",
  "entrance_proof_url": "URL do comprovante de entrada (anexo)",
  "boletos_request": "texto - solicitação de boletos"
}
```

## 2. UI — captura dos novos campos

Atualizar `CompleteActivityModal.tsx`: quando o item sendo concluído tiver `template_id = 0ff9b2d0-...` (etapa 3), renderizar 3 campos extras antes do botão "Concluir":
- Fluxo de pagamento (textarea)
- Comprovante de entrada (input file → bucket `checklist-attachments`, salva URL)
- Solicitação de boletos (textarea)

Os valores vão para `extra_data` no update do item.

## 3. Edge Function — `checklist-step-api`

Endpoint público com autenticação via header `x-api-key`.

**GET** `/functions/v1/checklist-step-api`

Query params:
- `date_from` (YYYY-MM-DD) — filtra por `completed_at` ou `created_at`
- `date_to` (YYYY-MM-DD)
- `responsible_id` (uuid do team_member responsável)
- `status` (opcional: `active` | `completed` | `blocked`)

Resposta (array):
```json
[{
  "checklist_item_id": "...",
  "status": "completed",
  "due_date": "2026-05-20",
  "completed_at": "2026-05-15T...",
  "project": {
    "id": "...", "name": "...", "focco_project_number": "357",
    "estimated_value": 120000
  },
  "client": { "id": "...", "name": "...", "contract_number": "..." },
  "responsible": { "id": "...", "name": "..." },
  "extra_data": {
    "payment_flow": "...",
    "entrance_proof_url": "https://...",
    "boletos_request": "..."
  }
}]
```

Filtra por `template_id = '0ff9b2d0-ee77-4204-b20b-b88974dab8ba'` (etapa 3).

Validação: header `x-api-key` deve bater com secret `CHECKLIST_API_KEY`. Sem ou inválida → 401.

## 4. Secret

Adicionar secret `CHECKLIST_API_KEY` (você define o valor — usado para autenticar quem consulta a API).

## 5. Exemplo de uso

```bash
curl -H "x-api-key: SUA_CHAVE" \
  "https://jkhvejsczbmwpqimjjun.supabase.co/functions/v1/checklist-step-api?date_from=2026-01-01&date_to=2026-12-31&responsible_id=feb13f62-..."
```

## Detalhes técnicos

- `extra_data` jsonb default `'{}'::jsonb`
- Edge function usa `SUPABASE_SERVICE_ROLE_KEY` para ler todas as linhas (bypass RLS), já que autentica via API key própria
- `config.toml`: `verify_jwt = false` para este function
- CORS habilitado para permitir uso de qualquer origem
- Limite default de 500 linhas por consulta (parametrizável via `?limit=`)