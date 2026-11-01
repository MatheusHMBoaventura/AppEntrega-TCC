-- cria extensao para geracao de uuid se nao existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- tabela de usuarios da aplicacao com tipo de perfil (entregador ou lojista)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    user_type VARCHAR(20) NOT NULL DEFAULT 'entregador' CHECK (user_type IN ('entregador', 'lojista')),
    avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- tabela de entregadores (foco em motocicletas)
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

-- tabela de lojistas / estabelecimentos
CREATE TABLE IF NOT EXISTS public.merchants (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- tabela de cartoes de credito dos usuarios
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

-- tabela de locais favoritados pelos usuarios
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

-- tabela de corridas e historico de entregas
CREATE TABLE IF NOT EXISTS public.rides (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    date VARCHAR(50) NOT NULL,
    price VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('requested', 'accepted', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- tabela de pedidos / fretes (portal de oportunidades de entregas)
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

-- tabela de logs de auditoria no formato semiestruturado
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    payload JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- indices para otimizacao de consultas de chaves estrangeiras e logs
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON public.rides(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_places_user_id ON public.places(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- insere usuario padrao para testes
INSERT INTO public.users (id, name, email, phone, avatar)
VALUES (
    'e3b0c442-98fc-11ee-b9d1-0242ac120002', 
    'João Silva', 
    'joao@email.com', 
    '(11) 98765-4321', 
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
) ON CONFLICT (email) DO NOTHING;

-- insere cartoes ficticios vinculados ao usuario de testes
INSERT INTO public.cards (user_id, brand, number, holder, expiry, is_default)
VALUES 
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', 'visa', '•••• •••• •••• 4242', 'JOÃO SILVA', '12/30', 1),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', 'mastercard', '•••• •••• •••• 9999', 'JOÃO SILVA', '08/29', 0)
ON CONFLICT DO NOTHING;

-- insere locais ficticios vinculados ao usuario de testes
INSERT INTO public.places (user_id, type, title, address, lat, lng)
VALUES 
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', 'home', 'Casa', 'Av. Paulista, 1000 - Bela Vista', -23.5615, -46.6559),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', 'work', 'Trabalho', 'Shopping Eldorado - Pinheiros', -23.5727, -46.6961)
ON CONFLICT DO NOTHING;

-- insere historico de corridas ficticias vinculadas ao usuario de testes
INSERT INTO public.rides (user_id, address, date, price, status)
VALUES 
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', '123 Main Street', 'Mar 28, 2026', 'R$ 24,50', 'completed'),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', 'Downtown Mall', 'Mar 25, 2026', 'R$ 18,00', 'completed'),
    ('e3b0c442-98fc-11ee-b9d1-0242ac120002', 'Airport Terminal 2', 'Mar 20, 2026', 'R$ 45,30', 'completed')
ON CONFLICT DO NOTHING;
