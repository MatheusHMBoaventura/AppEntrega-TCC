-- cria extensao para geracao de uuid se nao existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- tabela de usuarios da aplicacao
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
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

-- tabela de corridas solicitadas pelos usuarios
CREATE TABLE IF NOT EXISTS public.rides (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    date VARCHAR(50) NOT NULL,
    price VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('requested', 'accepted', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
