-- ============================================================================
-- MIGRATION: 005_business_rules_hardening.sql
-- Projeto: MotoHelp (AppEntrega-TCC)
-- Descrição: leva as regras de negócio de entrega para o servidor e fecha
--            brechas de política encontradas em teste.
--   1. Perfil criado por trigger em auth.users (cadastro não depende do cliente)
--   2. SELECT em users restrito (antes qualquer autenticado lia e-mail/telefone de todos)
--   3. audit_logs: inserção só com o próprio user_id (antes aceitava NULL)
--   4. orders: transições de status validadas por trigger; preço e dados do
--      pedido imutáveis após o aceite; conclusão só via complete_order() com QR
--   5. qr_code único
-- Pré-requisito: migrations 001 a 004 aplicadas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PERFIL AUTOMÁTICO A PARTIR DO SUPABASE AUTH
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    v_type VARCHAR(20) := COALESCE(NULLIF(v_meta->>'user_type', ''), 'entregador');
BEGIN
    -- Nunca permite auto-cadastro como administrador
    IF v_type NOT IN ('entregador', 'lojista') THEN
        v_type := 'entregador';
    END IF;

    INSERT INTO public.users (id, name, email, phone, user_type, avatar)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(v_meta->>'name', ''), NULLIF(v_meta->>'full_name', ''), split_part(NEW.email, '@', 1)),
        NEW.email,
        NULLIF(v_meta->>'phone', ''),
        v_type,
        COALESCE(NULLIF(v_meta->>'avatar_url', ''), 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150')
    )
    ON CONFLICT (id) DO NOTHING;

    IF v_type = 'entregador' AND NOT EXISTS (SELECT 1 FROM public.delivery_drivers WHERE user_id = NEW.id) THEN
        INSERT INTO public.delivery_drivers (user_id, cpf, vehicle_type, vehicle_plate, cnh)
        VALUES (NEW.id, COALESCE(v_meta->>'cpf', ''), 'Moto', COALESCE(v_meta->>'vehicle_plate', ''), COALESCE(v_meta->>'cnh', ''));
    ELSIF v_type = 'lojista' AND NOT EXISTS (SELECT 1 FROM public.merchants WHERE user_id = NEW.id) THEN
        INSERT INTO public.merchants (user_id, store_name, cnpj_cpf, category, address)
        VALUES (NEW.id, COALESCE(v_meta->>'store_name', ''), COALESCE(v_meta->>'cnpj_cpf', ''),
                COALESCE(NULLIF(v_meta->>'category', ''), 'Outros'), COALESCE(v_meta->>'store_address', ''));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. USERS: cada usuário vê o próprio perfil e apenas a contraparte dos
--    pedidos em que participa (lojista <-> entregador)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE (o.merchant_id = auth.uid() AND o.driver_id = users.id)
               OR (o.driver_id = auth.uid() AND o.merchant_id = users.id)
        )
    );

-- ----------------------------------------------------------------------------
-- 3. AUDIT_LOGS: sem eventos anônimos forjados pelo cliente
--    (os triggers SECURITY DEFINER continuam gravando normalmente)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- merchants não tem política para anon; o GRANT de 004 não tinha efeito
REVOKE SELECT ON public.merchants FROM anon;

-- ----------------------------------------------------------------------------
-- 4. ORDERS: regras de transição validadas no servidor
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_order_rules()
RETURNS TRIGGER AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_completing BOOLEAN := COALESCE(current_setting('motohelp.completing', true), '') = 'on';
BEGIN
    -- Chamadas sem usuário (SQL Editor / service role) e administradores não são restringidas
    IF v_uid IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- Identidade do pedido nunca muda
    IF NEW.merchant_id IS DISTINCT FROM OLD.merchant_id
       OR NEW.qr_code IS DISTINCT FROM OLD.qr_code
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Não é permitido alterar lojista, código de entrega ou data de criação do pedido.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Dados comerciais (preço, endereços, cliente, pacote) só pelo lojista e enquanto disponível
    IF (NEW.price, NEW.store_name, NEW.pickup_address, NEW.delivery_address, NEW.customer_name,
        NEW.customer_phone, NEW.package_details, NEW.lat, NEW.lng)
       IS DISTINCT FROM
       (OLD.price, OLD.store_name, OLD.pickup_address, OLD.delivery_address, OLD.customer_name,
        OLD.customer_phone, OLD.package_details, OLD.lat, OLD.lng) THEN
        IF NOT (v_uid = OLD.merchant_id AND OLD.status = 'available') THEN
            RAISE EXCEPTION 'Os dados do pedido só podem ser alterados pelo lojista antes do aceite.'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status = 'available' AND NEW.status IN ('in_transit', 'accepted') THEN
            -- Aceite: somente o próprio entregador, em pedido ainda sem entregador
            IF OLD.driver_id IS NOT NULL OR NEW.driver_id IS DISTINCT FROM v_uid THEN
                RAISE EXCEPTION 'Aceite inválido: o pedido já tem entregador ou não foi atribuído a você.'
                    USING ERRCODE = 'check_violation';
            END IF;
        ELSIF OLD.status = 'accepted' AND NEW.status = 'in_transit' THEN
            IF OLD.driver_id IS DISTINCT FROM v_uid THEN
                RAISE EXCEPTION 'Somente o entregador atribuído pode iniciar a entrega.'
                    USING ERRCODE = 'check_violation';
            END IF;
        ELSIF OLD.status IN ('accepted', 'in_transit') AND NEW.status = 'delivered' THEN
            -- Conclusão: somente via complete_order(), que valida o QR Code
            IF NOT v_completing THEN
                RAISE EXCEPTION 'A conclusão da entrega exige a leitura do QR Code (use complete_order).'
                    USING ERRCODE = 'check_violation';
            END IF;
        ELSIF OLD.status = 'available' AND NEW.status = 'cancelled' THEN
            IF v_uid IS DISTINCT FROM OLD.merchant_id THEN
                RAISE EXCEPTION 'Somente o lojista pode cancelar o pedido.'
                    USING ERRCODE = 'check_violation';
            END IF;
        ELSE
            RAISE EXCEPTION 'Transição de status não permitida: % -> %', OLD.status, NEW.status
                USING ERRCODE = 'check_violation';
        END IF;
    ELSIF NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
        RAISE EXCEPTION 'Não é permitido trocar o entregador de um pedido.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at AND NOT v_completing THEN
        RAISE EXCEPTION 'delivered_at é definido apenas na conclusão da entrega.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_order_rules ON public.orders;
CREATE TRIGGER trg_enforce_order_rules
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.enforce_order_rules();

-- Conclusão da entrega com validação do QR Code no servidor (RN02)
CREATE OR REPLACE FUNCTION public.complete_order(p_order_id BIGINT, p_qr_code TEXT)
RETURNS SETOF public.orders AS $$
DECLARE
    v_order public.orders;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'no_data_found';
    END IF;
    IF v_order.driver_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Este pedido não está atribuído a você.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF upper(trim(COALESCE(p_qr_code, ''))) <> upper(COALESCE(v_order.qr_code, '')) THEN
        RAISE EXCEPTION 'O QR Code não corresponde a este pedido.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_order.status NOT IN ('accepted', 'in_transit') THEN
        RAISE EXCEPTION 'O pedido não pode ser concluído no status atual (%).', v_order.status
            USING ERRCODE = 'check_violation';
    END IF;

    PERFORM set_config('motohelp.completing', 'on', true);
    RETURN QUERY
        UPDATE public.orders
           SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
         WHERE id = p_order_id
        RETURNING *;
    PERFORM set_config('motohelp.completing', 'off', true);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.complete_order(BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_order(BIGINT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. QR CODE ÚNICO
--    Se esta linha falhar, há códigos repetidos: consulte com
--    SELECT qr_code, count(*) FROM public.orders GROUP BY 1 HAVING count(*) > 1;
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_qr_code_unique
    ON public.orders (qr_code) WHERE qr_code IS NOT NULL;
