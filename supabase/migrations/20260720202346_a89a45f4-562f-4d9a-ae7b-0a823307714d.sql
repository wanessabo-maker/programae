CREATE OR REPLACE FUNCTION public.cascade_delete_action_related_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_origin_project_id uuid;
  v_project_id uuid;
  v_client_id uuid;
  v_classification text;
  v_name text;
  v_remaining int;
BEGIN
  DELETE FROM credit_transactions WHERE action_id = OLD.id;
  DELETE FROM project_environments WHERE action_id = OLD.id;

  SELECT id INTO v_origin_project_id
    FROM projects WHERE origin_action_id = OLD.id LIMIT 1;

  IF v_origin_project_id IS NOT NULL THEN
    v_project_id := v_origin_project_id;
    SELECT client_id INTO v_client_id FROM projects WHERE id = v_project_id;

    UPDATE actions SET project_id = NULL
      WHERE project_id = v_project_id AND id <> OLD.id;

    DELETE FROM cs_actions WHERE cs_case_id IN (
      SELECT id FROM cs_cases WHERE project_id = v_project_id
    );
    DELETE FROM cs_cases WHERE project_id = v_project_id;
    DELETE FROM technical_assistance WHERE project_id = v_project_id;
    DELETE FROM customer_success WHERE project_id = v_project_id;
    DELETE FROM projects WHERE id = v_project_id;

    IF v_client_id IS NOT NULL THEN
      DELETE FROM client_interactions WHERE client_id = v_client_id;
      DELETE FROM customer_success WHERE client_id = v_client_id;
      DELETE FROM technical_assistance WHERE client_id = v_client_id AND project_id IS NULL;
      UPDATE projects SET client_id = NULL WHERE client_id = v_client_id;
      DELETE FROM clients WHERE id = v_client_id;
    END IF;

    RETURN OLD;
  END IF;

  v_project_id := OLD.project_id;
  IF v_project_id IS NULL AND OLD.focco_project_number IS NOT NULL THEN
    SELECT id INTO v_project_id
      FROM projects WHERE focco_project_number = OLD.focco_project_number LIMIT 1;
  END IF;

  IF v_project_id IS NOT NULL THEN
    SELECT classification, name INTO v_classification, v_name
      FROM action_types WHERE id = OLD.action_type_id;

    IF v_classification = 'venda' THEN
      -- Só reverter se NÃO houver outras ações de venda para o mesmo projeto
      SELECT COUNT(*) INTO v_remaining
        FROM actions a
        JOIN action_types at ON at.id = a.action_type_id
       WHERE a.id <> OLD.id
         AND at.classification = 'venda'
         AND (a.project_id = v_project_id
              OR (a.project_id IS NULL AND a.focco_project_number IS NOT NULL
                  AND a.focco_project_number = (SELECT focco_project_number FROM projects WHERE id = v_project_id)));

      IF v_remaining = 0 THEN
        UPDATE projects SET
          planner_status = 'CONCLUIDO',
          planner_data_vendido = NULL,
          closed_value = NULL,
          closed_date = NULL,
          stage = 'em_negociacao',
          status = 'prospecting',
          planner_status_at = NOW()
        WHERE id = v_project_id
          AND planner_status = 'VENDIDO';

        UPDATE clients SET status = 'active'
          WHERE id = (SELECT client_id FROM projects WHERE id = v_project_id)
            AND status = 'closed';
      END IF;

    ELSIF v_classification = 'projeto' AND v_name ILIKE '%apresenta%' THEN
      SELECT COUNT(*) INTO v_remaining
        FROM actions a
        JOIN action_types at ON at.id = a.action_type_id
       WHERE a.id <> OLD.id
         AND at.classification = 'projeto'
         AND at.name ILIKE '%apresenta%'
         AND a.project_id = v_project_id;

      IF v_remaining = 0 THEN
        UPDATE projects SET
          planner_status = 'INICIADO',
          planner_data_concluido = NULL,
          planner_status_at = NOW()
        WHERE id = v_project_id
          AND planner_status = 'CONCLUIDO';
      END IF;
    END IF;
  END IF;

  RETURN OLD;
END;
$function$;

-- Restaurar o card da Priscila (FOCCO 367) para VENDIDO, já que a ação de venda existe
UPDATE projects SET
  planner_status = 'VENDIDO',
  planner_data_vendido = COALESCE(planner_data_vendido, '2026-06-17'::timestamptz),
  closed_date = COALESCE(closed_date, '2026-06-17'::date),
  closed_value = COALESCE(closed_value, 535000),
  stage = 'closed_won',
  status = 'closed',
  planner_status_at = NOW()
WHERE id = '7f02fb82-1380-4fdf-b5d5-5b29da6d96eb';

UPDATE clients SET status = 'closed'
WHERE id = 'b58ec42b-9fd1-4d1e-a2fc-c78480b14c5e';