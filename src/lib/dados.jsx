import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';

const Ctx = createContext(null);
export const useDados = () => useContext(Ctx);

export function DadosProvider({ eu, userId, children }) {
  const [d, setD] = useState({ carregando: true, erro: '', areas: [], funcionarios: [], docs: [], leituras: [], eventos: [], config: {} });

  const recarregar = useCallback(async () => {
    try {
      const [areas, funcionarios, docs, leituras, eventos, config] = await Promise.all([
        supabase.from('areas').select('*').order('ordem'),
        supabase.from('funcionarios').select('*').order('nome'),
        supabase.from('docs').select('*').order('codigo'),
        supabase.from('leituras').select('*'),
        supabase.from('eventos').select('*').order('em', { ascending: false }).limit(300),
        supabase.from('config').select('*'),
      ]);
      const falha = [areas, funcionarios, docs, leituras, eventos, config].find((r) => r.error);
      if (falha) throw falha.error;
      setD({
        carregando: false, erro: '',
        areas: areas.data, funcionarios: funcionarios.data, docs: docs.data,
        leituras: leituras.data, eventos: eventos.data,
        config: Object.fromEntries(config.data.map((c) => [c.chave, c.valor])),
      });
    } catch (e) {
      setD((x) => ({ ...x, carregando: false, erro: e.message || String(e) }));
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const valor = useMemo(() => {
    const ehEditor = eu.permissao === 'editar';
    const areaNome = (id) => d.areas.find((a) => a.id === id)?.nome || id || '—';
    const funcPorId = (id) => d.funcionarios.find((f) => f.id === id);
    const lido = (doc, uid) =>
      d.leituras.some((l) => l.user_id === uid && l.doc_id === doc.id && l.revisao === doc.revisao);
    // Aplicáveis = vigentes do departamento + extras em avisar_funcionarios
    const aplicaveis = (f) =>
      d.docs.filter((x) => x.status === 'vigente' && (x.area === f.area || (x.avisar_funcionarios || []).includes(f.id)));
    // Funcionários a quem o documento se aplica
    const publicoDoc = (doc) =>
      d.funcionarios.filter((f) => f.ativo && (f.area === doc.area || (doc.avisar_funcionarios || []).includes(f.id)));
    const destinatariosPadrao = (doc) => publicoDoc(doc).filter((f) => f.recebe_avisos);
    return { ...d, eu, userId, ehEditor, recarregar, areaNome, funcPorId, lido, aplicaveis, publicoDoc, destinatariosPadrao };
  }, [d, eu, userId, recarregar]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
