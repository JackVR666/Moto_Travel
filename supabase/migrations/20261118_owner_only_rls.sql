-- ESEGUI SOLO DOPO aver creato e verificato il tuo account Supabase Auth.
-- Sostituisci la stringa UUID qui sotto con l'ID utente in Authentication > Users.
-- Prima di applicare questo script, assicurati di poter entrare nell'app.
DO $$
DECLARE owner_id uuid := '00000000-0000-0000-0000-000000000000';
DECLARE tab text;
DECLARE pol record;
BEGIN
  IF owner_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'Sostituisci owner_id con il tuo User UID Supabase Auth prima di eseguire';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = owner_id) THEN
    RAISE EXCEPTION 'User UID non trovato in auth.users';
  END IF;

  FOREACH tab IN ARRAY ARRAY[
    'atlas_categories','expense_categories','expenses',
    'motorcycle_documents','motorcycle_maintenance','places_visited',
    'track_points','travel_checklist_items','travel_checklist_sections',
    'trip_day_diary','trip_day_waypoints','trip_days','trip_stops','trips','vacations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tab);
    -- Remove all old public/anonymous policies, including USING (true).
    FOR pol IN SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=tab
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,tab);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = %L::uuid) WITH CHECK (auth.uid() = %L::uuid)',
      'owner_only_' || tab, tab, owner_id, owner_id
    );
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tab);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',tab);
  END LOOP;
END $$;

-- Controllo: tutte le tabelle devono avere rowsecurity = true.
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
