CREATE OR REPLACE FUNCTION public.cascade_delete_action_related_data()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_origin_project_id uuid;
  v_project_id uuid;
  v_client_id uuid;
  v_classification text;
  v_name text;
BEGIN
  -- Sempre limpar créditos e ambientes vinculados à ação removida
  DELETE FROM credit_transactions WHERE action_id = OLD.id;
  DELETE FROM project_environments WHERE action_id = OLD.id;

  -- 1) Esta ação ORIGINOU algum projeto? (Captação adicionada ao Pipeline)
  SELECT id INTO v_origin_project_id
    FROM projects WHERE origin_action_id = OLD.id LIMIT 1;

  IF v_origin_project_id IS NOT NULL THEN
    -- Cascade completo (comportamento antigo) somente para a ação de ORIGEM
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

  -- 2) Ação SECUNDÁRIA (gerada pela movimentação no Pipeline ou + Registrar Ação):
  --    NUNCA apagar projeto/cliente; apenas reverter o status do card quando aplicável
  v_project_id := OLD.project_id;
  IF v_project_id IS NULL AND OLD.focco_project_number IS NOT NULL THEN
    SELECT id INTO v_project_id
      FROM projects WHERE focco_project_number = OLD.focco_project_number LIMIT 1;
  END IF;

  IF v_project_id IS NOT NULL THEN
    SELECT classification, name INTO v_classification, v_name
      FROM action_types WHERE id = OLD.action_type_id;

    IF v_classification = 'venda' THEN
      -- Reverter VENDIDO -> CONCLUIDO
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

    ELSIF v_classification = 'projeto' AND v_name ILIKE '%apresenta%' THEN
      -- Reverter CONCLUIDO -> INICIADO (Projeto de Apresentação ou Reforma)
      UPDATE projects SET
        planner_status = 'INICIADO',
        planner_data_concluido = NULL,
        planner_status_at = NOW()
      WHERE id = v_project_id
        AND planner_status = 'CONCLUIDO';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;