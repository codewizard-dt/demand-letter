-- Truncate all non-migration tables in the local Postgres schema.
-- This is intentionally explicit so we can add exclusions in one place.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  )
  LOOP
    EXECUTE format(
      'TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE;',
      r.tablename
    );
  END LOOP;
END
$$;
