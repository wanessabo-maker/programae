-- Fix the cascade delete function to handle the circular reference issue
-- The problem is that the trigger tries to delete the project while the action still references it
-- Solution: Set the action's project_id to NULL first (handled differently since it's a BEFORE trigger)

CREATE OR REPLACE FUNCTION public.cascade_delete_action_related_data()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id uuid;
  v_client_id uuid;
  v_professional_id uuid;
BEGIN
  -- Get the project_id and professional_id from the action being deleted
  v_project_id := OLD.project_id;
  v_professional_id := OLD.professional_id;
  
  -- If no project_id in action, try to find by focco_project_number
  IF v_project_id IS NULL AND OLD.focco_project_number IS NOT NULL THEN
    SELECT id INTO v_project_id 
    FROM projects 
    WHERE focco_project_number = OLD.focco_project_number
    LIMIT 1;
  END IF;
  
  -- Delete credit transactions linked to this action FIRST
  DELETE FROM credit_transactions WHERE action_id = OLD.id;
  
  -- If we have a project, handle project-related deletions
  IF v_project_id IS NOT NULL THEN
    -- Get the client_id from the project BEFORE deleting it
    SELECT client_id INTO v_client_id FROM projects WHERE id = v_project_id;
    
    -- Delete CS actions linked to CS cases for this project
    DELETE FROM cs_actions WHERE cs_case_id IN (
      SELECT id FROM cs_cases WHERE project_id = v_project_id
    );
    
    -- Delete CS cases linked to this project
    DELETE FROM cs_cases WHERE project_id = v_project_id;
    
    -- Delete technical assistance records linked to this project
    DELETE FROM technical_assistance WHERE project_id = v_project_id;
    
    -- Delete customer success records linked to this project
    DELETE FROM customer_success WHERE project_id = v_project_id;
    
    -- IMPORTANT: Clear the project reference from ALL actions that reference this project
    -- This prevents the FK constraint violation
    UPDATE actions SET project_id = NULL WHERE project_id = v_project_id AND id != OLD.id;
    
    -- Now safe to delete the project
    DELETE FROM projects WHERE id = v_project_id;
    
    -- If we have a client, delete related data
    IF v_client_id IS NOT NULL THEN
      -- Delete client interactions
      DELETE FROM client_interactions WHERE client_id = v_client_id;
      
      -- Delete customer success records linked to this client
      DELETE FROM customer_success WHERE client_id = v_client_id;
      
      -- Delete technical assistance records linked to this client (not project)
      DELETE FROM technical_assistance WHERE client_id = v_client_id AND project_id IS NULL;
      
      -- Clear client reference from other projects before deleting client
      UPDATE projects SET client_id = NULL WHERE client_id = v_client_id;
      
      -- Delete the client
      DELETE FROM clients WHERE id = v_client_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;