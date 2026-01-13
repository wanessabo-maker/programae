-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- RLS for user_roles table
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger to auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies for all existing tables to require authentication

-- DROP old permissive policies
DROP POLICY IF EXISTS "Public access" ON public.action_types;
DROP POLICY IF EXISTS "Public access" ON public.actions;
DROP POLICY IF EXISTS "Public access" ON public.areas;
DROP POLICY IF EXISTS "Public access" ON public.credit_transactions;
DROP POLICY IF EXISTS "Public access" ON public.goals;
DROP POLICY IF EXISTS "Public access" ON public.professional_categories;
DROP POLICY IF EXISTS "Public access" ON public.professional_types;
DROP POLICY IF EXISTS "Public access" ON public.professionals;
DROP POLICY IF EXISTS "Public access" ON public.reminders;
DROP POLICY IF EXISTS "Public access" ON public.rewards;
DROP POLICY IF EXISTS "Public access" ON public.special_dates;
DROP POLICY IF EXISTS "Public access" ON public.team_members;

-- Create authenticated read policies for all tables
CREATE POLICY "Authenticated users can read" ON public.action_types
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.actions
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.areas
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.credit_transactions
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.goals
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.professional_categories
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.professional_types
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.professionals
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.reminders
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.rewards
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.special_dates
  FOR SELECT USING (public.is_authenticated());

CREATE POLICY "Authenticated users can read" ON public.team_members
  FOR SELECT USING (public.is_authenticated());

-- Data tables: All authenticated users can modify (shared dashboard)
CREATE POLICY "Authenticated users can insert" ON public.actions
  FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update" ON public.actions
  FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Authenticated users can delete" ON public.actions
  FOR DELETE USING (public.is_authenticated());

CREATE POLICY "Authenticated users can insert" ON public.professionals
  FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update" ON public.professionals
  FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Authenticated users can delete" ON public.professionals
  FOR DELETE USING (public.is_authenticated());

CREATE POLICY "Authenticated users can insert" ON public.reminders
  FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update" ON public.reminders
  FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Authenticated users can delete" ON public.reminders
  FOR DELETE USING (public.is_authenticated());

CREATE POLICY "Authenticated users can insert" ON public.credit_transactions
  FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update" ON public.credit_transactions
  FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Authenticated users can delete" ON public.credit_transactions
  FOR DELETE USING (public.is_authenticated());

CREATE POLICY "Authenticated users can insert" ON public.special_dates
  FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Authenticated users can update" ON public.special_dates
  FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Authenticated users can delete" ON public.special_dates
  FOR DELETE USING (public.is_authenticated());

-- Config tables: Only admins can modify
CREATE POLICY "Admins can modify" ON public.areas
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify" ON public.team_members
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify" ON public.goals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify" ON public.action_types
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify" ON public.rewards
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify" ON public.professional_types
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify" ON public.professional_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));