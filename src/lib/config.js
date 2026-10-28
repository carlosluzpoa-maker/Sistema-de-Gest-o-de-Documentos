// Conexão com o Supabase do SGI Docs.
// Cole aqui a Project URL e a chave pública (anon / publishable) do projeto do SGI.
// A chave pública pode ficar no código: quem protege os dados são o login e o RLS do schema.sql.
// NUNCA cole aqui a chave service_role / secret.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'COLE_AQUI_A_PROJECT_URL';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'COLE_AQUI_A_CHAVE_PUBLICA';

export const CONFIGURADO = SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('COLE_');
