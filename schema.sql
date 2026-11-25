-- ============================================================================
-- schema.sql: ESQUEMA COMPLETO DO MOTOHELP (gerado a partir de migrations/001 a 005)
-- Não edite este arquivo à mão: altere as migrations e gere de novo com
--   cat migrations/00*.sql > schema.sql  (mantendo este cabeçalho)
-- Requer o ambiente do Supabase (schema auth, auth.uid(), papéis anon/authenticated).
-- ============================================================================

-- ============================================================================
-- MIGRATION: 001_initial_schema.sql
-- Projeto: MotoHelp (AppEntrega-TCC)
-- Descrição: Estrutura relacional base do banco de dados na nuvem (Supabase / PostgreSQL)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    user_type VARCHAR(20) NOT NULL DEFAULT 'entregador' CHECK (user_type IN ('entregador', 'lojista', 'admin')),
    avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE ENTREGADORES
CREATE TABLE IF NOT EXISTS public.delivery_drivers (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cpf VARCHAR(14) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'Moto',
    vehicle_plate VARCHAR(10) NOT NULL,
    cnh VARCHAR(20) NOT NULL,
    is_online BOOLEAN DEFAULT TRUE,
    fuel_consumption REAL DEFAULT 35.0,
    last_oil_km INTEGER DEFAULT 0,
    last_tires_km INTEGER DEFAULT 0,
    last_chain_km INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE LOJISTAS / ESTABELECIMENTOS
CREATE TABLE IF NOT EXISTS public.merchants (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE CARTOES DE CREDITO
CREATE TABLE IF NOT EXISTS public.cards (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    brand VARCHAR(50) NOT NULL,
    number VARCHAR(30) NOT NULL,
    holder VARCHAR(255) NOT NULL,
    expiry VARCHAR(7) NOT NULL,
    is_default INTEGER DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE LOCAIS FAVORITOS
CREATE TABLE IF NOT EXISTS public.places (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA DE HISTÓRICO DE CORRIDAS
CREATE TABLE IF NOT EXISTS public.rides (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    date VARCHAR(50) NOT NULL,
    price VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('requested', 'accepted', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE PEDIDOS E FRETES
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    merchant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    store_name VARCHAR(255) NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    package_details TEXT,
    price VARCHAR(20) NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    qr_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'in_transit', 'delivered', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- 8. TABELA DE LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    payload JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON public.rides(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_places_user_id ON public.places(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);



-- ============================================================================
-- MIGRATION: 002_enable_rls_and_policies.sql
-- Projeto: MotoHelp (AppEntrega-TCC)
-- Descrição: Habilitação de Row Level Security (RLS) e Políticas de Isolamento
-- Conformidade: §7.5 do Projeto e Especificações de Segurança Supabase
-- ============================================================================

-- Função Auxiliar: Identifica com segurança o ID do usuário autenticado (auth.uid())
-- ou fallback controlado caso seja chamada internamente
CREATE OR REPLACE FUNCTION public.current_auth_id() 
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Função Auxiliar: Verifica se o usuário autenticado possui papel de administrador
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND user_type = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 1. TABELA: public.users
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuário autenticado pode ver seu próprio perfil ou estabelecimentos/motoristas públicos ativos
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() 
        OR user_type IN ('entregador', 'lojista')
        OR public.is_admin()
    );

-- INSERT: Durante o cadastro, o usuário pode inserir apenas seu próprio registro (id = auth.uid())
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        id = auth.uid() 
        AND user_type != 'admin' -- Impede auto-atribuição de perfil administrador
    );

-- UPDATE: Usuário só pode atualizar seu próprio perfil e NÃO pode alterar seu user_type para admin
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (
        (id = auth.uid() AND user_type != 'admin')
        OR public.is_admin()
    );

-- DELETE: Usuário comum não pode deletar perfis diretamente (apenas admin ou trigger de auth)
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
CREATE POLICY "users_delete_policy" ON public.users
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ============================================================================
-- 2. TABELA: public.delivery_drivers
-- ============================================================================
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

-- SELECT: O próprio motorista, lojistas com pedidos ou administradores
DROP POLICY IF EXISTS "delivery_drivers_select_policy" ON public.delivery_drivers;
CREATE POLICY "delivery_drivers_select_policy" ON public.delivery_drivers
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.driver_id = delivery_drivers.user_id 
              AND (orders.merchant_id = auth.uid() OR orders.status = 'available')
        )
    );

-- INSERT: Apenas o próprio usuário autenticado
DROP POLICY IF EXISTS "delivery_drivers_insert_policy" ON public.delivery_drivers;
CREATE POLICY "delivery_drivers_insert_policy" ON public.delivery_drivers
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Apenas o próprio motorista pode atualizar seus dados (placa, cnh, status, consumo)
DROP POLICY IF EXISTS "delivery_drivers_update_policy" ON public.delivery_drivers;
CREATE POLICY "delivery_drivers_update_policy" ON public.delivery_drivers
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ============================================================================
-- 3. TABELA: public.merchants
-- ============================================================================
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- SELECT: Dados de estabelecimentos e lojistas são públicos para usuários autenticados (marketplace/SOS)
DROP POLICY IF EXISTS "merchants_select_policy" ON public.merchants;
CREATE POLICY "merchants_select_policy" ON public.merchants
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- INSERT: Lojista só pode criar estabelecimento vinculado ao seu user_id
DROP POLICY IF EXISTS "merchants_insert_policy" ON public.merchants;
CREATE POLICY "merchants_insert_policy" ON public.merchants
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Apenas o dono do estabelecimento ou admin pode editar
DROP POLICY IF EXISTS "merchants_update_policy" ON public.merchants;
CREATE POLICY "merchants_update_policy" ON public.merchants
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ============================================================================
-- 4. TABELA: public.cards (Dados Financeiros - Isolamento Estrito)
-- ============================================================================
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuário só enxerga seus próprios cartões
DROP POLICY IF EXISTS "cards_select_policy" ON public.cards;
CREATE POLICY "cards_select_policy" ON public.cards
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT: Usuário só pode cadastrar cartão para sua própria conta
DROP POLICY IF EXISTS "cards_insert_policy" ON public.cards;
CREATE POLICY "cards_insert_policy" ON public.cards
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Usuário só pode alterar cartões de sua própria conta
DROP POLICY IF EXISTS "cards_update_policy" ON public.cards;
CREATE POLICY "cards_update_policy" ON public.cards
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: Usuário só pode remover cartões de sua própria conta
DROP POLICY IF EXISTS "cards_delete_policy" ON public.cards;
CREATE POLICY "cards_delete_policy" ON public.cards
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- 5. TABELA: public.places (Favoritos - Isolamento Estrito)
-- ============================================================================
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "places_select_policy" ON public.places;
CREATE POLICY "places_select_policy" ON public.places
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "places_insert_policy" ON public.places;
CREATE POLICY "places_insert_policy" ON public.places
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "places_delete_policy" ON public.places;
CREATE POLICY "places_delete_policy" ON public.places
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- 6. TABELA: public.rides (Histórico de Corridas - Isolamento Estrito)
-- ============================================================================
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rides_select_policy" ON public.rides;
CREATE POLICY "rides_select_policy" ON public.rides
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "rides_insert_policy" ON public.rides;
CREATE POLICY "rides_insert_policy" ON public.rides
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 7. TABELA: public.orders (Pedidos e Fretes - Regras de Negócio de Entregas)
-- ============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- 1. Lojista criador do pedido (merchant_id = auth.uid())
-- 2. Entregador atribuído (driver_id = auth.uid())
-- 3. Pedidos abertos disponíveis para qualquer motorista (status = 'available')
-- 4. Administrador do sistema
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT
    TO authenticated
    USING (
        merchant_id = auth.uid()
        OR driver_id = auth.uid()
        OR status = 'available'
        OR public.is_admin()
    );

-- INSERT: Lojistas autenticados podem criar pedidos
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
        merchant_id = auth.uid() 
        OR public.is_admin()
    );

-- UPDATE:
-- 1. Lojista pode editar/cancelar pedidos que ainda não foram aceitos
-- 2. Entregador pode aceitar pedido disponível (atribuindo a si mesmo: driver_id = auth.uid())
-- 3. Entregador atribuído pode concluir entrega (status = 'delivered')
-- 4. Impedir que usuário confirme pedidos de outros motoristas
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE
    TO authenticated
    USING (
        merchant_id = auth.uid()
        OR driver_id = auth.uid()
        OR (status = 'available' AND driver_id IS NULL)
        OR public.is_admin()
    )
    WITH CHECK (
        -- Lojista atualizando seu pedido
        (merchant_id = auth.uid())
        -- Motorista aceitando pedido disponível
        OR (driver_id = auth.uid())
        OR public.is_admin()
    );

-- ============================================================================
-- 8. TABELA: public.audit_logs (Proteção e Imutabilidade)
-- ============================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas administradores do sistema podem consultar o histórico completo de auditoria
-- Ou o próprio usuário pode visualizar ações vinculadas ao seu ID
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- INSERT: Permitido para registro de eventos operacionais pela aplicação autenticada
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR public.is_admin());

-- UPDATE & DELETE: TOTALMENTE PROIBIDOS PARA QUALQUER USUÁRIO (IMUTABILIDADE)
-- Nem o próprio usuário nem outros podem alterar ou apagar logs de auditoria
DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;



-- ============================================================================
-- MIGRATION: 003_audit_triggers.sql
-- Projeto: MotoHelp (AppEntrega-TCC)
-- Descrição: Triggers automáticos no PostgreSQL para registrar auditoria em public.audit_logs
-- Garantia: Não depende exclusivamente do frontend; imutabilidade e rastreabilidade total.
-- ============================================================================

-- 1. FUNÇÃO GENÉRICA DE AUDITORIA AUTOMÁTICA VIA TRIGGERS
CREATE OR REPLACE FUNCTION public.process_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_action VARCHAR(100);
    v_record_id TEXT;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_table_name VARCHAR(100);
BEGIN
    -- Captura o usuário responsável com segurança da sessão Supabase
    v_user_id := auth.uid();
    v_table_name := TG_TABLE_NAME::VARCHAR;

    IF (TG_OP = 'INSERT') THEN
        v_action := v_table_name || '.insert';
        v_record_id := NEW.id::TEXT;
        v_new_data := to_jsonb(NEW);
        
        -- Higienização de campos sensíveis se existirem
        IF v_new_data ? 'password' THEN
            v_new_data := v_new_data - 'password';
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := v_table_name || '.update';
        v_record_id := NEW.id::TEXT;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        -- Higienização
        IF v_old_data ? 'password' THEN v_old_data := v_old_data - 'password'; END IF;
        IF v_new_data ? 'password' THEN v_new_data := v_new_data - 'password'; END IF;

        -- Ações específicas para entregas (public.orders)
        IF v_table_name = 'orders' THEN
            IF OLD.status != NEW.status THEN
                v_action := 'order.status_change.' || NEW.status;
            END IF;
            IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
                v_action := 'delivery.completed';
            END IF;
            IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
                v_action := 'delivery.cancelled';
            END IF;
            IF OLD.driver_id IS NULL AND NEW.driver_id IS NOT NULL THEN
                v_action := 'order.accepted_by_driver';
            END IF;
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        v_action := v_table_name || '.delete';
        v_record_id := OLD.id::TEXT;
        v_old_data := to_jsonb(OLD);

        IF v_old_data ? 'password' THEN v_old_data := v_old_data - 'password'; END IF;
    END IF;

    -- Se o user_id não foi obtido de auth.uid() (ex: chamada de sistema ou trigger),
    -- tenta herdar do registro quando disponível
    IF v_user_id IS NULL THEN
        IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
            IF v_new_data ? 'driver_id' AND (v_new_data->>'driver_id') IS NOT NULL THEN
                v_user_id := (v_new_data->>'driver_id')::UUID;
            ELSIF v_new_data ? 'merchant_id' AND (v_new_data->>'merchant_id') IS NOT NULL THEN
                v_user_id := (v_new_data->>'merchant_id')::UUID;
            ELSIF v_new_data ? 'user_id' AND (v_new_data->>'user_id') IS NOT NULL THEN
                v_user_id := (v_new_data->>'user_id')::UUID;
            END IF;
        END IF;
    END IF;

    -- Insere o log de auditoria no PostgreSQL
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        payload,
        created_at
    ) VALUES (
        v_user_id,
        v_action,
        v_table_name,
        v_record_id,
        v_old_data,
        v_new_data,
        jsonb_build_object(
            'op', TG_OP,
            'schema', TG_TABLE_SCHEMA,
            'table', v_table_name
        ),
        CURRENT_TIMESTAMP
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. TRIGGERS AUTOMÁTICOS NAS TABELAS PRINCIPAIS
-- ============================================================================

-- Trigger para ORDERS (Entregas e Pedidos)
DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_trigger();

-- Trigger para USERS (Criação e atualização de contas)
DROP TRIGGER IF EXISTS trg_audit_users ON public.users;
CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_trigger();

-- Trigger para CARDS (Dados bancários e cartões)
DROP TRIGGER IF EXISTS trg_audit_cards ON public.cards;
CREATE TRIGGER trg_audit_cards
    AFTER INSERT OR UPDATE OR DELETE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_trigger();

-- Trigger para DELIVERY_DRIVERS (Veículos e documentos)
DROP TRIGGER IF EXISTS trg_audit_delivery_drivers ON public.delivery_drivers;
CREATE TRIGGER trg_audit_delivery_drivers
    AFTER INSERT OR UPDATE OR DELETE ON public.delivery_drivers
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_trigger();



-- ============================================================================
-- MIGRATION: 004_permissions_and_grants.sql
-- Projeto: MotoHelp (AppEntrega-TCC)
-- Descrição: Configuração de privilégios mínimos (Least Privilege) para anon e authenticated
-- ============================================================================

-- 1. REVOGAR PRIVILÉGIOS EXCESSIVOS DE TABELAS SENSÍVEIS PARA ANON
REVOKE ALL ON public.cards FROM anon;
REVOKE ALL ON public.delivery_drivers FROM anon;
REVOKE ALL ON public.rides FROM anon;
REVOKE ALL ON public.places FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.audit_logs FROM anon;

-- Anon só pode ler estabelecimentos públicos se necessário (ex: SOS pré-login)
GRANT SELECT ON public.merchants TO anon;

-- 2. PRIVILÉGIOS CONCEDIDOS PARA USUÁRIOS AUTENTICADOS (authenticated)
-- Acesso às tabelas sempre intermediado por RLS (Row Level Security)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.delivery_drivers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.merchants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.places TO authenticated;
GRANT SELECT, INSERT ON public.rides TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- AUDITORIA: Authenticated pode ler (apenas o que a política permitir) e inserir
-- NUNCA pode executar UPDATE ou DELETE em audit_logs
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM authenticated, anon;

-- Permissões em sequences para inserções com auto-incremento (BIGSERIAL)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;



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


