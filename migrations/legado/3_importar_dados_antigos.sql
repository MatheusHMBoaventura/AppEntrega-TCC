-- ============================================================================
-- MotoHelp: PASSO 3 de 3 (rode depois do schema.sql)
-- Copia os dados das tabelas legacy_* para as tabelas novas.
-- Pode ser rodado mais de uma vez: o que já foi copiado é ignorado.
-- Cartões: só a máscara com os 4 últimos dígitos é copiada.
-- ============================================================================
DO $$
DECLARE
    v_default_avatar TEXT := 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
BEGIN
    -- 1. Perfis antigos de contas que existem no Supabase Auth
    IF to_regclass('public.legacy_users') IS NOT NULL THEN
        INSERT INTO public.users (id, name, email, phone, user_type, avatar, created_at)
        SELECT a.id,
               left(COALESCE(NULLIF(j->>'name', ''), split_part(a.email, '@', 1)), 255),
               a.email,
               left(NULLIF(j->>'phone', ''), 20),
               CASE WHEN COALESCE(j->>'user_type', j->>'role', j->>'type') = 'lojista' THEN 'lojista' ELSE 'entregador' END,
               COALESCE(NULLIF(j->>'avatar', ''), v_default_avatar),
               COALESCE((j->>'created_at')::timestamptz, a.created_at, CURRENT_TIMESTAMP)
        FROM (SELECT to_jsonb(l) AS j FROM public.legacy_users l) s
        JOIN auth.users a ON a.id::text = s.j->>'id'
        WHERE a.email IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;

    -- 2. Contas do Auth que ainda não têm perfil
    INSERT INTO public.users (id, name, email, user_type, avatar)
    SELECT a.id,
           left(COALESCE(NULLIF(a.raw_user_meta_data->>'name', ''), NULLIF(a.raw_user_meta_data->>'full_name', ''), split_part(a.email, '@', 1)), 255),
           a.email,
           CASE WHEN a.raw_user_meta_data->>'user_type' = 'lojista' THEN 'lojista' ELSE 'entregador' END,
           COALESCE(NULLIF(a.raw_user_meta_data->>'avatar_url', ''), v_default_avatar)
    FROM auth.users a
    WHERE a.email IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id)
    ON CONFLICT DO NOTHING;

    -- 3. Ficha de entregador ou lojista para quem não tem
    INSERT INTO public.delivery_drivers (user_id, cpf, vehicle_plate, cnh)
    SELECT u.id, '', '', '' FROM public.users u
    WHERE u.user_type = 'entregador'
      AND NOT EXISTS (SELECT 1 FROM public.delivery_drivers d WHERE d.user_id = u.id);

    INSERT INTO public.merchants (user_id, store_name, cnpj_cpf, category, address)
    SELECT u.id, u.name, '', 'Outros', '' FROM public.users u
    WHERE u.user_type = 'lojista'
      AND NOT EXISTS (SELECT 1 FROM public.merchants m WHERE m.user_id = u.id);

    -- 4. Cartões (somente máscara)
    IF to_regclass('public.legacy_cards') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cards) THEN
        INSERT INTO public.cards (user_id, brand, number, holder, expiry, is_default, created_at)
        SELECT u.id,
               left(COALESCE(NULLIF(j->>'brand', ''), 'Cartão'), 50),
               '**** **** **** ' || right(regexp_replace(COALESCE(j->>'number', ''), '\D', '', 'g'), 4),
               left(COALESCE(NULLIF(j->>'holder', ''), u.name), 255),
               left(COALESCE(NULLIF(j->>'expiry', ''), '--/--'), 7),
               CASE WHEN lower(COALESCE(j->>'is_default', '0')) IN ('1', 'true', 't') THEN 1 ELSE 0 END,
               COALESCE((j->>'created_at')::timestamptz, CURRENT_TIMESTAMP)
        FROM (SELECT to_jsonb(l) AS j FROM public.legacy_cards l) s
        JOIN public.users u ON u.id::text = s.j->>'user_id';
    END IF;

    -- 5. Locais salvos (só os que têm coordenadas)
    IF to_regclass('public.legacy_places') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.places) THEN
        INSERT INTO public.places (user_id, type, title, address, lat, lng, created_at)
        SELECT u.id,
               left(COALESCE(NULLIF(j->>'type', ''), 'other'), 50),
               left(COALESCE(NULLIF(j->>'title', ''), 'Local'), 100),
               COALESCE(j->>'address', ''),
               (j->>'lat')::double precision,
               (j->>'lng')::double precision,
               COALESCE((j->>'created_at')::timestamptz, CURRENT_TIMESTAMP)
        FROM (SELECT to_jsonb(l) AS j FROM public.legacy_places l) s
        JOIN public.users u ON u.id::text = s.j->>'user_id'
        WHERE s.j->>'lat' IS NOT NULL AND s.j->>'lng' IS NOT NULL;
    END IF;

    -- 6. Histórico de corridas
    IF to_regclass('public.legacy_rides') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rides) THEN
        INSERT INTO public.rides (user_id, address, date, price, status, created_at)
        SELECT u.id,
               COALESCE(j->>'address', ''),
               left(COALESCE(j->>'date', ''), 50),
               left(COALESCE(j->>'price', ''), 20),
               CASE WHEN j->>'status' IN ('requested', 'accepted', 'ongoing', 'completed', 'cancelled') THEN j->>'status' ELSE 'completed' END,
               COALESCE((j->>'created_at')::timestamptz, CURRENT_TIMESTAMP)
        FROM (SELECT to_jsonb(l) AS j FROM public.legacy_rides l) s
        JOIN public.users u ON u.id::text = s.j->>'user_id';
    END IF;
END $$;

-- Conferência: antes (legacy) x depois
SELECT 'users' AS tabela, (SELECT count(*) FROM public.legacy_users) AS antes, (SELECT count(*) FROM public.users) AS depois
UNION ALL SELECT 'cards', (SELECT count(*) FROM public.legacy_cards), (SELECT count(*) FROM public.cards)
UNION ALL SELECT 'places', (SELECT count(*) FROM public.legacy_places), (SELECT count(*) FROM public.places)
UNION ALL SELECT 'rides', (SELECT count(*) FROM public.legacy_rides), (SELECT count(*) FROM public.rides)
UNION ALL SELECT 'contas no Auth', (SELECT count(*) FROM auth.users), NULL;
