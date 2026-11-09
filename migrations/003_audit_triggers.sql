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

