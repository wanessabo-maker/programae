-- Create a function to handle cascade deletion when an action is deleted
CREATE OR REPLACE FUNCTION public.cascade_delete_action_related_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id uuid;
  v_client_id uuid;
  v_professional_id uuid;
BEGIN
  -- Get the project_id and professional_id from the deleted action
  v_project_id := OLD.project_id;
  v_professional_id := OLD.professional_id;
  
  -- If no project_id in action, try to find by focco_project_number
  IF v_project_id IS NULL AND OLD.focco_project_number IS NOT NULL THEN
    SELECT id INTO v_project_id 
    FROM projects 
    WHERE focco_project_number = OLD.focco_project_number
    LIMIT 1;
  END IF;
  
  -- Delete credit transactions linked to this action
  DELETE FROM credit_transactions WHERE action_id = OLD.id;
  
  -- If we have a project, handle project-related deletions
  IF v_project_id IS NOT NULL THEN
    -- Get the client_id from the project
    SELECT client_id INTO v_client_id FROM projects WHERE id = v_project_id;
    
    -- Delete CS actions linked to CS cases for this project
    DELETE FROM cs_actions WHERE cs_case_id IN (
      SELECT id FROM cs_cases WHERE project_id = v_project_id
    );
    
    -- Delete CS cases linked to this project
    DELETE FROM cs_cases WHERE project_id = v_project_id;
    
    -- Delete technical assistance records linked to this project
    DELETE FROM technical_assistance WHERE project_id = v_project_id;
    
    -- Delete the project itself
    DELETE FROM projects WHERE id = v_project_id;
    
    -- If we have a client, delete related data
    IF v_client_id IS NOT NULL THEN
      -- Delete client interactions
      DELETE FROM client_interactions WHERE client_id = v_client_id;
      
      -- Delete customer success records linked to this client
      DELETE FROM customer_success WHERE client_id = v_client_id;
      
      -- Delete technical assistance records linked to this client (not project)
      DELETE FROM technical_assistance WHERE client_id = v_client_id AND project_id IS NULL;
      
      -- Delete the client
      DELETE FROM clients WHERE id = v_client_id;
    END IF;
  END IF;
  
  -- Delete credit transactions linked to the professional from this action
  DELETE FROM credit_transactions 
  WHERE professional_id = v_professional_id 
    AND action_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger to execute cascade delete before action is deleted
DROP TRIGGER IF EXISTS trigger_cascade_delete_action ON actions;
CREATE TRIGGER trigger_cascade_delete_action
  BEFORE DELETE ON actions
  FOR EACH ROW
  EXECUTE FUNCTION cascade_delete_action_related_data();