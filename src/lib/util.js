export const TIPOS = ['Procedimento', 'Instrução de trabalho', 'Formulário', 'Planilha', 'Manual', 'Política'];
export const PERIODICIDADES = [6, 12, 24];
export const STATUS = {
  rascunho: 'Rascunho',
  em_aprovacao: 'Em aprovação',
  vigente: 'Vigente',
  obsoleto: 'Obsoleto',
};
export const EVENTOS = {
  novo: 'Novo documento',
  revisao: 'Nova revisão',
  em_aprovacao: 'Enviado para aprovação',
  aprovado: 'Aprovado e vigente',
  obsoleto: 'Tornado obsoleto',
  arquivo: 'Arquivo substituído',
};

export const hoje = () => new Date().toISOString().slice(0, 10);

export function addMeses(iso, meses) {
  const [a, m, d] = (iso || hoje()).split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1 + meses, d));
  return dt.toISOString().slice(0, 10);
}

export function fmtData(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export const fmtDataHora = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function diasAte(iso) {
  if (!iso) return null;
  const alvo = new Date(`${iso}T00:00:00Z`).getTime();
  const base = new Date(`${hoje()}T00:00:00Z`).getTime();
  return Math.round((alvo - base) / 86400000);
}

// 'vencida' | 'vence30' | 'ok' | null (só documentos vigentes têm validade controlada)
export function validade(doc) {
  if (doc.status !== 'vigente') return null;
  const d = diasAte(doc.proxima_revisao);
  if (d === null) return null;
  if (d < 0) return 'vencida';
  if (d <= 30) return 'vence30';
  return 'ok';
}

export const rotuloRev = (n) => `Rev. ${String(n).padStart(2, '0')}`;

export function nomeSeguro(nome) {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export function baixarCsv(nomeArquivo, linhas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const texto = linhas.map((l) => l.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function lerPreferencia(chave, padrao) {
  try { return localStorage.getItem(chave) ?? padrao; } catch { return padrao; }
}
export function gravarPreferencia(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ }
}
