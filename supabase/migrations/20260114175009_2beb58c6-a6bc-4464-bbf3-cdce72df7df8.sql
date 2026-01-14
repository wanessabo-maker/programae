-- Add validity fields to goals table
ALTER TABLE public.goals 
ADD COLUMN validity_type TEXT DEFAULT 'mensal',
ADD COLUMN start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN end_date DATE,
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add expires_at and status to credit_transactions
ALTER TABLE public.credit_transactions 
ADD COLUMN expires_at DATE,
ADD COLUMN status TEXT DEFAULT 'active';

-- Create system_settings table for storing app-wide configurations
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_settings
CREATE POLICY "Authenticated users can read settings" 
ON public.system_settings 
FOR SELECT 
USING (is_authenticated());

CREATE POLICY "Admins can modify settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default credit validity setting
INSERT INTO public.system_settings (key, value) 
VALUES ('credit_validity', '{"type": "annual", "days": 365}')
ON CONFLICT (key) DO NOTHING;