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

