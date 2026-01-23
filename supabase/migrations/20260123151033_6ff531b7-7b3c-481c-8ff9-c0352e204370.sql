-- Drop and recreate the trigger to use AFTER DELETE instead
-- The BEFORE trigger cannot modify the row being deleted, so we need a different approach

DROP TRIGGER IF EXISTS trigger_cascade_delete_action ON public.actions;

-- Create a new function that nullifies project_id BEFORE delete
-- and then cleans up in an AFTER trigger
CREATE OR REPLACE FUNCTION public.nullify_action_project_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Nullify the project_id of the action being deleted
  -- This allows us to delete the project without FK violation
  UPDATE actions SET project_id = NULL WHERE id = OLD.id;
  
  -- Return OLD with project_id nullified for the cascade function
  OLD.project_id := NULL;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the cascade function to work with the stored project info
CREATE OR REPLACE FUNCTION public.cascade_delete_action_related_data()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id uuid;
  v_client_id uuid;
BEGIN
  -- Get the project_id from TG_ARGV or from OLD.focco_project_number
  -- Since we nullified project_id, we need to find it by focco_project_number
  IF OLD.focco_project_number IS NOT NULL THEN
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
    
    -- Clear project reference from all actions
    UPDATE actions SET project_id = NULL WHERE project_id = v_project_id;
    
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
    
    -- Now safe to delete the project
    DELETE FROM projects WHERE id = v_project_id;
    
    -- If we have a client, delete related data
    IF v_client_id IS NOT NULL THEN
      -- Delete client interactions
      DELETE FROM client_interactions WHERE client_id = v_client_id;
      
      -- Delete customer success records linked to this client
      DELETE FROM customer_success WHERE client_id = v_client_id;
      
      -- Delete technical assistance records linked to this client
      DELETE FROM technical_assistance WHERE client_id = v_client_id AND project_id IS NULL;
      
      -- Clear client reference from other projects
      UPDATE projects SET client_id = NULL WHERE client_id = v_client_id;
      
      -- Delete the client
      DELETE FROM clients WHERE id = v_client_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the AFTER DELETE trigger for cascade cleanup
CREATE TRIGGER trigger_cascade_delete_action
  AFTER DELETE ON public.actions
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_action_related_data();