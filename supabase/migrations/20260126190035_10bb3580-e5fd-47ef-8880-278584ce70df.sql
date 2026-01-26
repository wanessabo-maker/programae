-- Create user_area_assignments table to link users to dynamic areas
CREATE TABLE public.user_area_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, area_id)
);

-- Enable RLS
ALTER TABLE public.user_area_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all user area assignments"
  ON public.user_area_assignments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own area assignments"
  ON public.user_area_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_area_assignments_user_id ON public.user_area_assignments(user_id);
CREATE INDEX idx_user_area_assignments_area_id ON public.user_area_assignments(area_id);