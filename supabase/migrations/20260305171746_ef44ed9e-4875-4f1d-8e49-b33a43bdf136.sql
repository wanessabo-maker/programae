
-- Fix existing projects missing created_by: set it to responsible_id where null
UPDATE projects SET created_by = responsible_id WHERE created_by IS NULL AND responsible_id IS NOT NULL;
