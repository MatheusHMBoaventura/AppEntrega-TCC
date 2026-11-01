-- ============================================================================
-- SCRIPT DE SEED / POPULAÇÃO DE DADOS PARA SUPABASE (POSTGRESQL) & ENDPOINTS
-- Projeto: AppEntrega-TCC
-- Perfis: Entregadores (Moto) e Lojistas (Estabelecimentos)
-- ============================================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. SEED DE USUÁRIOS (public.users)
-- ----------------------------------------------------------------------------
INSERT INTO public.users (id, name, email, phone, user_type, avatar)
VALUES 
    -- Entregadores (Moto)
    ('e3b0c442-98fc-11ee-b9d1-0242ac120001', 'João Silva', 'joao.entregador@email.com', '(11) 98765-4321', 'entregador', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150'),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', 'Carlos Eduardo', 'carlos.moto@email.com', '(11) 97777-1111', 'entregador', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120003', 'Lucas Mendes', 'lucas.entregas@email.com', '(11) 96666-2222', 'entregador', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'),
    
    -- Lojistas (Estabelecimentos)
    ('f4b1d553-99fd-11ee-b9d1-0242ac120001', 'Matheus Oliveira', 'pizzaria@email.com', '(11) 99999-9999', 'lojista', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120002', 'Fernanda Lima', 'burgershop@email.com', '(11) 98888-3333', 'lojista', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120003', 'Roberto Alves', 'farmacia.central@email.com', '(11) 95555-4444', 'lojista', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120004', 'Marcos Souza', 'borracharia.rapida@email.com', '(11) 94444-5555', 'lojista', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150')
ON CONFLICT (email) DO UPDATE SET 
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    user_type = EXCLUDED.user_type,
    avatar = EXCLUDED.avatar;

-- ----------------------------------------------------------------------------
-- 2. SEED DE ENTREGADORES (public.delivery_drivers)
-- ----------------------------------------------------------------------------
INSERT INTO public.delivery_drivers (user_id, cpf, vehicle_type, vehicle_plate, cnh, is_online)
VALUES 
    ('e3b0c442-98fc-11ee-b9d1-0242ac120001', '123.456.789-00', 'Moto', 'ABC-1234', '12345678900', TRUE),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', '987.654.321-11', 'Moto', 'XYZ-9876', '98765432100', TRUE),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120003', '456.789.123-22', 'Moto', 'MOT-5544', '45678912300', FALSE)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. SEED DE LOJISTAS (public.merchants)
-- ----------------------------------------------------------------------------
INSERT INTO public.merchants (user_id, store_name, cnpj_cpf, category, address)
VALUES 
    ('f4b1d553-99fd-11ee-b9d1-0242ac120001', 'Pizzaria do Matheus', '12.345.678/0001-99', 'Restaurante', 'Av. Paulista, 2000 - Bela Vista, São Paulo - SP'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120002', 'Burger Express', '98.765.432/0001-11', 'Restaurante', 'Rua Augusta, 500 - Consolação, São Paulo - SP'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120003', 'Farmácia Central 24h', '55.443.322/0001-88', 'Farmácia', 'Av. Rebouças, 1200 - Pinheiros, São Paulo - SP'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120004', 'Borracharia & AutoPeças Express', '33.221.100/0001-44', 'Borracharia / Auto Peças', 'Av. Santo Amaro, 800 - Itaim Bibi, São Paulo - SP')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. SEED DE HISTÓRICO DE ENTREGAS (public.rides)
-- ----------------------------------------------------------------------------
INSERT INTO public.rides (user_id, address, date, price, status)
VALUES 
    ('e3b0c442-98fc-11ee-b9d1-0242ac120001', 'Entrega: Pizzaria do Matheus -> Av. Faria Lima, 1500', '25/08/2026 14:30', 'R$ 18,50', 'completed'),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120001', 'Entrega: Burger Express -> Alameda Santos, 800', '25/08/2026 15:10', 'R$ 14,00', 'completed'),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', 'Entrega Emergencial: Borracharia Express -> Marginal Pinheiros KM 12', '25/08/2026 13:45', 'R$ 35,00', 'completed'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120001', 'Pedido #1042: 2x Pizza Grande + Refrigerante', '25/08/2026 14:00', 'R$ 89,90', 'completed')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. SEED DE PEDIDOS / FRETES DISPONÍVEIS (public.orders)
-- ----------------------------------------------------------------------------
INSERT INTO public.orders (id, merchant_id, store_name, pickup_address, delivery_address, customer_name, customer_phone, package_details, price, lat, lng, qr_code, status)
VALUES 
    (1, 'f4b1d553-99fd-11ee-b9d1-0242ac120001', 'Pizzaria do Matheus', 'Av. Paulista, 2000 - Bela Vista', 'Rua Augusta, 1200 - Consolação', 'Lucas Souza', '(11) 98888-1234', '1x Pizza Família + Refrigerante 2L', 'R$ 16,50', -23.5532, -46.6572, 'ENT-10421', 'available'),
    (2, 'f4b1d553-99fd-11ee-b9d1-0242ac120002', 'Burger Express', 'Rua Augusta, 500 - Consolação', 'Alameda Santos, 950 - Cerqueira César', 'Juliana Paes', '(11) 97777-4321', '2x Smash Burger + Fritas', 'R$ 14,00', -23.5663, -46.6521, 'ENT-10422', 'available'),
    (3, 'f4b1d553-99fd-11ee-b9d1-0242ac120003', 'Farmácia Central 24h', 'Av. Rebouças, 1200 - Pinheiros', 'Rua da Consolação, 2500 - Cerqueira César', 'Marcos Vinícius', '(11) 96666-9988', 'Medicamentos térmicos em caixa lacrada', 'R$ 19,00', -23.5578, -46.6625, 'ENT-10423', 'available')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. SEED DE LOGS DE AUDITORIA (public.audit_logs)
-- ----------------------------------------------------------------------------
INSERT INTO public.audit_logs (user_id, action, payload, ip_address)
VALUES 
    ('e3b0c442-98fc-11ee-b9d1-0242ac120001', 'auth.login.success', '{"email": "joao.entregador@email.com", "role": "entregador", "vehicle": "Moto ABC-1234"}', '189.120.45.12'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120001', 'auth.login.success', '{"email": "pizzaria@email.com", "role": "lojista", "store": "Pizzaria do Matheus"}', '189.120.45.99'),
    ('f4b1d553-99fd-11ee-b9d1-0242ac120001', 'delivery.request.created', '{"store_id": "f4b1d553-99fd-11ee-b9d1-0242ac120001", "driver_assigned": "e3b0c442-98fc-11ee-b9d1-0242ac120001", "vehicle_type": "Moto"}', '189.120.45.99')
ON CONFLICT DO NOTHING;
