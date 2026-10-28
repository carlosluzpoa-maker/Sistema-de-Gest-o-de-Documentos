import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, CONFIGURADO } from './config.js';

export const supabase = createClient(
  CONFIGURADO ? SUPABASE_URL : 'https://exemplo.supabase.co',
  CONFIGURADO ? SUPABASE_ANON_KEY : 'chave-nao-configurada',
);
