-- ============================================================================
-- SUÍTE DE TESTES DE SEGURANÇA E ISOLAMENTO (RLS & AUDITORIA)
-- Projeto: MotoHelp (AppEntrega-TCC)
-- Executável no pgTAP ou via psql / Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Criação de extensões se necessário
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(18);

-- ----------------------------------------------------------------------------
-- CENÁRIO DE TESTE: 3 USUÁRIOS (Motorista A, Lojista B, Admin)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION setup_security_tests() RETURNS void AS $$
DECLARE
    uid_driver UUID := '11111111-1111-1111-1111-111111111111';
    uid_merchant UUID := '22222222-2222-2222-2222-222222222222';
    uid_admin UUID := '99999999-9999-9999-9999-999999999999';
BEGIN
    -- Limpa registros de teste prévios
    DELETE FROM public.audit_logs WHERE user_id IN (uid_driver, uid_merchant, uid_admin);
    DELETE FROM public.orders WHERE merchant_id = uid_merchant OR driver_id = uid_driver;
    DELETE FROM public.cards WHERE user_id IN (uid_driver, uid_merchant);
    DELETE FROM public.users WHERE id IN (uid_driver, uid_merchant, uid_admin);

    -- Insere usuários de teste
    INSERT INTO public.users (id, name, email, user_type) VALUES
        (uid_driver, 'Motorista Teste A', 'driver.a@test.com', 'entregador'),
        (uid_merchant, 'Lojista Teste B', 'merchant.b@test.com', 'lojista'),
        (uid_admin, 'Admin Teste', 'admin@test.com', 'admin');

    -- Insere cartões de teste
    INSERT INTO public.cards (user_id, brand, number, holder, expiry) VALUES
        (uid_driver, 'Visa', '•••• 1111', 'MOTORISTA A', '12/28'),
        (uid_merchant, 'Mastercard', '•••• 2222', 'LOJISTA B', '10/29');

    -- Insere pedido de teste do Lojista B
    INSERT INTO public.orders (id, merchant_id, store_name, pickup_address, delivery_address, customer_name, price, qr_code, status)
    VALUES (99901, uid_merchant, 'Loja B', 'Rua B, 100', 'Rua Cliente, 200', 'Cliente Teste', 'R$ 20,00', 'ENT-99901', 'available');
END;
$$ LANGUAGE plpgsql;

SELECT setup_security_tests();

-- ----------------------------------------------------------------------------
-- 1. TESTES DE RLS HABILITADO
-- ----------------------------------------------------------------------------
SELECT ok(relrowsecurity, 'RLS deve estar habilitado na tabela users')
FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace;

SELECT ok(relrowsecurity, 'RLS deve estar habilitado na tabela cards')
FROM pg_class WHERE relname = 'cards' AND relnamespace = 'public'::regnamespace;

SELECT ok(relrowsecurity, 'RLS deve estar habilitado na tabela orders')
FROM pg_class WHERE relname = 'orders' AND relnamespace = 'public'::regnamespace;

SELECT ok(relrowsecurity, 'RLS deve estar habilitado na tabela audit_logs')
FROM pg_class WHERE relname = 'audit_logs' AND relnamespace = 'public'::regnamespace;

-- ----------------------------------------------------------------------------
-- 2. TESTES DE ISOLAMENTO: CARTOES DE CRÉDITO (cards)
-- ----------------------------------------------------------------------------
-- Simula sessão autenticada como Motorista A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

SELECT is(
    (SELECT count(*)::INT FROM public.cards),
    1,
    'Motorista A deve visualizar APENAS seu próprio cartão'
);

SELECT is(
    (SELECT holder FROM public.cards LIMIT 1),
    'MOTORISTA A',
    'Cartão visível deve ser estritamente o do Motorista A'
);

-- Motorista A tenta atualizar o cartão do Lojista B
UPDATE public.cards SET holder = 'HACKED' WHERE user_id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;

SELECT is(
    (SELECT holder FROM public.cards WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    'LOJISTA B',
    'Tentativa de alteração de cartão de outro usuário deve ser bloqueada pelo RLS'
);

-- ----------------------------------------------------------------------------
-- 3. TESTES DE ISOLAMENTO: PEDIDOS E ENTREGAS (orders)
-- ----------------------------------------------------------------------------
-- Motorista A visualiza pedido disponível
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

SELECT is(
    (SELECT count(*)::INT FROM public.orders WHERE id = 99901),
    1,
    'Motorista A deve visualizar pedido disponível para aceite'
);

-- Motorista A aceita o pedido atribuindo a si mesmo
UPDATE public.orders SET driver_id = '11111111-1111-1111-1111-111111111111', status = 'in_transit' WHERE id = 99901;

SELECT is(
    (SELECT status FROM public.orders WHERE id = 99901),
    'in_transit',
    'Motorista A consegue aceitar o pedido disponível com sucesso'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- 4. TESTES DE AUDITORIA AUTOMÁTICA VIA TRIGGERS
-- ----------------------------------------------------------------------------
SELECT isnt_empty(
    'SELECT * FROM public.audit_logs WHERE record_id = ''99901''',
    'A alteração de status da entrega deve gerar log automático de auditoria'
);

SELECT ok(
    EXISTS (SELECT 1 FROM public.audit_logs WHERE record_id = '99901' AND action LIKE 'order.%'),
    'Ação de auditoria deve refletir a operação na tabela orders'
);

-- ----------------------------------------------------------------------------
-- 5. TESTES DE PROTEÇÃO DA AUDITORIA CONTRA ADULTERAÇÃO
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

-- Tenta alterar registros de auditoria
UPDATE public.audit_logs SET action = 'tampered' WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- Tenta apagar registros de auditoria
DELETE FROM public.audit_logs WHERE user_id = '11111111-1111-1111-1111-111111111111';

RESET ROLE;

SELECT is(
    (SELECT count(*)::INT FROM public.audit_logs WHERE action = 'tampered'),
    0,
    'Usuário autenticado não pode adulterar registros em audit_logs'
);

SELECT ok(
    (SELECT count(*)::INT FROM public.audit_logs WHERE record_id = '99901') > 0,
    'Usuário autenticado não pode excluir registros de audit_logs'
);

-- ----------------------------------------------------------------------------
-- 6. TESTES DE PREVENÇÃO DE ELEVAÇÃO DE PRIVILÉGIOS (users)
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

-- Motorista tenta alterar seu perfil para admin
UPDATE public.users SET user_type = 'admin' WHERE id = '11111111-1111-1111-1111-111111111111';

RESET ROLE;

SELECT is(
    (SELECT user_type FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111'),
    'entregador',
    'Tentativa de auto-atribuição do perfil admin deve ser rejeitada pela política de WITH CHECK'
);

SELECT * FROM finish();
ROLLBACK;

