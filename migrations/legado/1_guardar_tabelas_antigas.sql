-- ============================================================================
-- MotoHelp: PASSO 1 de 3
-- Renomeia as tabelas antigas para legacy_* (nada é apagado) e as fecha para
-- o app, para que o schema.sql possa criar as tabelas novas.
-- Ordem: 1_guardar_tabelas_antigas.sql -> schema.sql -> 3_importar_dados_antigos.sql
-- ============================================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','delivery_drivers','merchants','orders','rides','cards','places','audit_logs'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            IF to_regclass('public.legacy_' || t) IS NOT NULL THEN
                RAISE EXCEPTION 'public.legacy_% já existe. Este passo já foi rodado?', t;
            END IF;
            EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, 'legacy_' || t);
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', 'legacy_' || t);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', 'legacy_' || t);
            RAISE NOTICE 'public.% -> public.legacy_%', t, t;
        END IF;
    END LOOP;
END $$;

-- Gatilhos de versões antigas em auth.users podem quebrar o cadastro.
-- Se esta consulta listar algum além de on_auth_user_created, avise.
SELECT tgname AS gatilho, tgfoid::regprocedure AS funcao
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
