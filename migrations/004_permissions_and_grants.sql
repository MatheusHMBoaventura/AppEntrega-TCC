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

