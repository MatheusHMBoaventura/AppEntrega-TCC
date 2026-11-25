-- ============================================================================
-- SUÍTE DE TESTES DE SEGURANÇA E REGRAS DE NEGÓCIO (RLS, AUDITORIA, PEDIDOS)
-- Projeto: MotoHelp (AppEntrega-TCC)
-- Pré-requisito: migrations 001 a 005 aplicadas e extensão pgTAP disponível.
-- Execução: psql -f test_rls_security.sql  (ou SQL Editor do Supabase)
-- Tudo roda dentro de uma transação e é desfeito no ROLLBACK final.
--
-- Comandos que DEVEM falhar usam throws_ok(): assim o erro esperado vira um
-- teste aprovado em vez de abortar a transação (problema da versão anterior).
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(33);

-- ----------------------------------------------------------------------------
-- CENÁRIO: Motorista A, Motorista C, Lojista B e Admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.setup_security_tests() RETURNS void AS $$
DECLARE
    uid_driver   UUID := '11111111-1111-1111-1111-111111111111';
    uid_merchant UUID := '22222222-2222-2222-2222-222222222222';
    uid_driver_c UUID := '33333333-3333-3333-3333-333333333333';
    uid_admin    UUID := '99999999-9999-9999-9999-999999999999';
BEGIN
    DELETE FROM public.audit_logs WHERE user_id IN (uid_driver, uid_merchant, uid_driver_c, uid_admin);
    DELETE FROM public.orders WHERE merchant_id = uid_merchant OR driver_id IN (uid_driver, uid_driver_c);
    DELETE FROM public.cards WHERE user_id IN (uid_driver, uid_merchant);
    DELETE FROM public.users WHERE id IN (uid_driver, uid_merchant, uid_driver_c, uid_admin);

    INSERT INTO public.users (id, name, email, phone, user_type) VALUES
        (uid_driver,   'Motorista Teste A', 'driver.a@test.com',   '11900000001', 'entregador'),
        (uid_merchant, 'Lojista Teste B',   'merchant.b@test.com', '11900000002', 'lojista'),
        (uid_driver_c, 'Motorista Teste C', 'driver.c@test.com',   '11900000003', 'entregador'),
        (uid_admin,    'Admin Teste',       'admin@test.com',      NULL,          'admin');

    INSERT INTO public.cards (user_id, brand, number, holder, expiry) VALUES
        (uid_driver,   'Visa',       '•••• 1111', 'MOTORISTA A', '12/28'),
        (uid_merchant, 'Mastercard', '•••• 2222', 'LOJISTA B',   '10/29');

    INSERT INTO public.orders (id, merchant_id, store_name, pickup_address, delivery_address, customer_name, price, qr_code, status)
    VALUES (99901, uid_merchant, 'Loja B', 'Rua B, 100', 'Rua Cliente, 200', 'Cliente Teste', 'R$ 20,00', 'ENT-9990100001', 'available');
END;
$$ LANGUAGE plpgsql;

SELECT pg_temp.setup_security_tests();

-- ----------------------------------------------------------------------------
-- 1. RLS HABILITADO (4)
-- ----------------------------------------------------------------------------
SELECT ok(relrowsecurity, 'RLS habilitado em users')      FROM pg_class WHERE relname = 'users'      AND relnamespace = 'public'::regnamespace;
SELECT ok(relrowsecurity, 'RLS habilitado em cards')      FROM pg_class WHERE relname = 'cards'      AND relnamespace = 'public'::regnamespace;
SELECT ok(relrowsecurity, 'RLS habilitado em orders')     FROM pg_class WHERE relname = 'orders'     AND relnamespace = 'public'::regnamespace;
SELECT ok(relrowsecurity, 'RLS habilitado em audit_logs') FROM pg_class WHERE relname = 'audit_logs' AND relnamespace = 'public'::regnamespace;

-- ----------------------------------------------------------------------------
-- 2. ISOLAMENTO DE CARTÕES (3)
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

SELECT is((SELECT count(*)::INT FROM public.cards), 1, 'Motorista A vê apenas o próprio cartão');
SELECT is((SELECT holder FROM public.cards LIMIT 1), 'MOTORISTA A', 'O cartão visível é o do Motorista A');
UPDATE public.cards SET holder = 'HACKED' WHERE user_id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;
SELECT is((SELECT holder FROM public.cards WHERE user_id = '22222222-2222-2222-2222-222222222222'), 'LOJISTA B',
          'Alteração do cartão de outro usuário é bloqueada pela RLS');

-- ----------------------------------------------------------------------------
-- 3. ISOLAMENTO DE PERFIS (users) (1)
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';
SELECT is((SELECT count(*)::INT FROM public.users), 1,
          'Motorista C, sem pedidos em comum, vê apenas o próprio perfil (sem e-mail/telefone de terceiros)');
RESET ROLE;

-- ----------------------------------------------------------------------------
-- 4. ACEITE DE FRETE (4)
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is((SELECT count(*)::INT FROM public.orders WHERE id = 99901), 1, 'Motorista A vê o pedido disponível');
UPDATE public.orders SET driver_id = '11111111-1111-1111-1111-111111111111', status = 'in_transit' WHERE id = 99901;
SELECT is((SELECT status FROM public.orders WHERE id = 99901), 'in_transit', 'Motorista A aceita o pedido disponível');
SELECT is((SELECT count(*)::INT FROM public.users WHERE id = '22222222-2222-2222-2222-222222222222'), 1,
          'Após o aceite, Motorista A vê o perfil do lojista do pedido');

SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';
UPDATE public.orders SET driver_id = '33333333-3333-3333-3333-333333333333', status = 'in_transit' WHERE id = 99901;
RESET ROLE;
SELECT is((SELECT driver_id FROM public.orders WHERE id = 99901), '11111111-1111-1111-1111-111111111111'::uuid,
          'Segundo aceite (Motorista C) não afeta o pedido já aceito (RN03)');

-- ----------------------------------------------------------------------------
-- 5. REGRAS DE NEGÓCIO DO PEDIDO (5)
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT throws_ok($$ UPDATE public.orders SET price = 'R$ 999,00' WHERE id = 99901 $$, '23514', NULL,
                 'Entregador não consegue alterar o preço do frete');
SELECT throws_ok($$ UPDATE public.orders SET status = 'delivered' WHERE id = 99901 $$, '23514', NULL,
                 'Entregador não consegue concluir sem complete_order (QR Code)');
SELECT throws_ok($$ UPDATE public.orders SET driver_id = '33333333-3333-3333-3333-333333333333' WHERE id = 99901 $$, '23514', NULL,
                 'Entregador não consegue repassar o pedido para outro entregador');

SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SELECT throws_ok($$ UPDATE public.orders SET status = 'delivered' WHERE id = 99901 $$, '23514', NULL,
                 'Lojista não consegue marcar a entrega como concluída');
SELECT throws_ok($$ UPDATE public.orders SET price = 'R$ 1,00' WHERE id = 99901 $$, '23514', NULL,
                 'Lojista não consegue alterar o preço depois do aceite');
RESET ROLE;

-- ----------------------------------------------------------------------------
-- 6. CONCLUSÃO POR QR CODE: complete_order() (5)
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';
SELECT throws_ok($$ SELECT * FROM public.complete_order(99901, 'ENT-9990100001') $$, 'P0002', NULL,
                 'complete_order recusa entregador que não é o do pedido (o pedido fica invisível para ele)');

SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT throws_ok($$ SELECT * FROM public.complete_order(99901, 'ENT-0000000000') $$, '23514', NULL,
                 'complete_order recusa QR Code errado');
SELECT lives_ok($$ SELECT * FROM public.complete_order(99901, 'ent-9990100001') $$,
                'complete_order conclui com o QR Code correto (sem diferenciar maiúsculas)');
SELECT is((SELECT status FROM public.orders WHERE id = 99901), 'delivered', 'Pedido fica como entregue');
SELECT throws_ok($$ SELECT * FROM public.complete_order(99901, 'ENT-9990100001') $$, '23514', NULL,
                 'Pedido já entregue não pode ser concluído de novo');
RESET ROLE;

-- ----------------------------------------------------------------------------
-- 7. AUDITORIA AUTOMÁTICA E IMUTÁVEL (6)
-- ----------------------------------------------------------------------------
SELECT ok(EXISTS (SELECT 1 FROM public.audit_logs WHERE record_id = '99901' AND action = 'order.accepted_by_driver'),
          'Trigger registra o aceite do pedido');
SELECT ok(EXISTS (SELECT 1 FROM public.audit_logs WHERE record_id = '99901' AND action = 'delivery.completed'),
          'Trigger registra a conclusão da entrega');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT throws_ok($$ UPDATE public.audit_logs SET action = 'tampered' $$, '42501', NULL,
                 'Usuário não consegue alterar registros de auditoria');
SELECT throws_ok($$ DELETE FROM public.audit_logs $$, '42501', NULL,
                 'Usuário não consegue excluir registros de auditoria');
SELECT throws_ok($$ INSERT INTO public.audit_logs (user_id, action) VALUES (NULL, 'forjado') $$, '42501', NULL,
                 'Usuário não consegue inserir log anônimo (user_id NULL)');
SELECT lives_ok($$ INSERT INTO public.audit_logs (user_id, action) VALUES ('11111111-1111-1111-1111-111111111111', 'auth.logout') $$,
                'Usuário registra evento com o próprio user_id');
RESET ROLE;

-- ----------------------------------------------------------------------------
-- 8. ELEVAÇÃO DE PRIVILÉGIO (1)
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT throws_ok($$ UPDATE public.users SET user_type = 'admin' WHERE id = '11111111-1111-1111-1111-111111111111' $$, '42501', NULL,
                 'Usuário não consegue se promover a administrador (WITH CHECK)');
RESET ROLE;

-- ----------------------------------------------------------------------------
-- 9. PERFIL CRIADO PELO TRIGGER DO SUPABASE AUTH (4)
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ('44444444-4444-4444-4444-444444444444', 'loja.nova@test.com',
     '{"name":"Loja Nova","user_type":"lojista","store_name":"Loja Nova","cnpj_cpf":"12345678000199","category":"Restaurante","store_address":"Rua X, 1"}'),
    ('55555555-5555-5555-5555-555555555555', 'espertinho@test.com',
     '{"name":"Espertinho","user_type":"admin"}');

SELECT is((SELECT user_type::TEXT FROM public.users WHERE id = '44444444-4444-4444-4444-444444444444'), 'lojista',
          'Trigger cria o perfil do lojista em public.users');
SELECT is((SELECT count(*)::INT FROM public.merchants WHERE user_id = '44444444-4444-4444-4444-444444444444'), 1,
          'Trigger cria o registro em merchants');
SELECT is((SELECT user_type::TEXT FROM public.users WHERE id = '55555555-5555-5555-5555-555555555555'), 'entregador',
          'Cadastro pedindo user_type admin vira entregador');
SELECT is((SELECT count(*)::INT FROM public.delivery_drivers WHERE user_id = '55555555-5555-5555-5555-555555555555'), 1,
          'Trigger cria o registro em delivery_drivers para entregador');

SELECT * FROM finish();
ROLLBACK;
