ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

CREATE UNIQUE INDEX IF NOT EXISTS events_public_slug_key ON public.events (public_slug);

CREATE TABLE IF NOT EXISTS public.event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

ALTER TABLE public.event_collaborators
  ADD CONSTRAINT event_collaborators_role_check CHECK (role IN ('viewer', 'editor'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_collaborators TO authenticated;
GRANT ALL ON public.event_collaborators TO service_role;
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.event_owner(_event_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.events WHERE id = _event_id
$$;

CREATE OR REPLACE FUNCTION public.is_event_public(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_public FROM public.events WHERE id = _event_id), false)
$$;

CREATE OR REPLACE FUNCTION public.has_event_access(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.event_owner(_event_id) = _user_id
      OR EXISTS (
        SELECT 1 FROM public.event_collaborators c
        WHERE c.event_id = _event_id
          AND lower(c.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_event(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.event_owner(_event_id) = _user_id
      OR EXISTS (
        SELECT 1 FROM public.event_collaborators c
        WHERE c.event_id = _event_id
          AND c.role = 'editor'
          AND lower(c.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
$$;

CREATE POLICY "Owners manage collaborators" ON public.event_collaborators
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND public.event_owner(event_id) = auth.uid());

CREATE POLICY "Collaborators see own invitation" ON public.event_collaborators
  FOR SELECT TO authenticated
  USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));

-- events
CREATE POLICY "Collaborators view events" ON public.events
  FOR SELECT TO authenticated USING (public.has_event_access(id, auth.uid()));
CREATE POLICY "Editors update events" ON public.events
  FOR UPDATE TO authenticated
  USING (public.can_edit_event(id, auth.uid()))
  WITH CHECK (public.can_edit_event(id, auth.uid()));
CREATE POLICY "Public events are viewable" ON public.events
  FOR SELECT TO anon, authenticated USING (is_public);

-- categories
CREATE POLICY "Collaborators view categories" ON public.categories
  FOR SELECT TO authenticated USING (public.has_event_access(event_id, auth.uid()));
CREATE POLICY "Editors manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.can_edit_event(event_id, auth.uid()))
  WITH CHECK (public.can_edit_event(event_id, auth.uid()));
CREATE POLICY "Public event categories are viewable" ON public.categories
  FOR SELECT TO anon, authenticated USING (public.is_event_public(event_id));

-- program elements
CREATE POLICY "Collaborators view elements" ON public.program_elements
  FOR SELECT TO authenticated USING (public.has_event_access(event_id, auth.uid()));
CREATE POLICY "Editors manage elements" ON public.program_elements
  FOR ALL TO authenticated
  USING (public.can_edit_event(event_id, auth.uid()))
  WITH CHECK (public.can_edit_event(event_id, auth.uid()));
CREATE POLICY "Public event elements are viewable" ON public.program_elements
  FOR SELECT TO anon, authenticated USING (public.is_event_public(event_id));

GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.program_elements TO anon;