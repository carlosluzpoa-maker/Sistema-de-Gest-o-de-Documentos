import { supabase } from './supabase.js';
import { nomeSeguro } from './util.js';

export async function enviarArquivo(docId, revisao, file) {
  const path = `${docId}/r${String(revisao).padStart(2, '0')}/${Date.now()}-${nomeSeguro(file.name)}`;
  const { error } = await supabase.storage.from('documentos').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;
  return { path, nome: file.name, contentType: file.type || '', tamanho: file.size };
}

export async function urlArquivo(arq, baixar) {
  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl(arq.path, 300, baixar ? { download: arq.nome } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function abrirArquivo(arq, baixar = false) {
  const url = await urlArquivo(arq, baixar);
  window.open(url, '_blank', 'noopener');
}

export async function registrarEvento(doc, tipo, { porId, resumo = '' }) {
  const { data, error } = await supabase
    .from('eventos')
    .insert({
      tipo, doc_id: doc.id, codigo: doc.codigo, titulo: doc.titulo, area: doc.area,
      revisao: doc.revisao, por_id: porId, resumo,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export function proximoCodigo(area, docs) {
  if (!area) return '';
  const maior = docs
    .filter((d) => d.area === area.id)
    .map((d) => Number(String(d.codigo).split(/\s+/).pop()))
    .filter(Number.isFinite)
    .reduce((m, n) => Math.max(m, n), 0);
  return `${area.sigla} ${String(maior + 1).padStart(3, '0')}`;
}

export const idDoCodigo = (codigo) => codigo.trim().toUpperCase().replace(/\s+/g, '-');
