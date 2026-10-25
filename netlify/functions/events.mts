import { loadConfig } from './_lib/config';
import { blobsKV } from './_lib/store';

const NAMES = new Set(['diagnostico_inicio', 'tela_vista', 'diagnostico_concluido', 'resultado_visto', 'oferta_clique', 'checkout_inicio', 'pagamento_confirmado', 'aprofundamento_concluido', 'geracao_concluida', 'geracao_falha', 'download', 'avaliacao_utilidade', 'interesse_especialista']);

/** Contadores agregados por dia e ambiente. Não guarda respostas, textos nem dados pessoais. */
export default async (req: Request) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  let cfg;
  try {
    cfg = loadConfig();
  } catch {
    return new Response(null, { status: 204 });
  }
  if (cfg.mode === 'demo') return new Response(null, { status: 204 });
  try {
    const e = JSON.parse((await req.text()).slice(0, 2000));
    if (!NAMES.has(e.name)) return new Response(null, { status: 204 });
    const dim = e.name === 'tela_vista' ? `:${String(e.props?.screen_id ?? '').replace(/[^a-z_]/g, '').slice(0, 30)}` : '';
    const key = `${cfg.mode}/events/${new Date().toISOString().slice(0, 10)}`;
    const kv = await blobsKV('relatorio-do-trafego');
    for (let i = 0; i < 5; i++) {
      const cur = await kv.getJSON<Record<string, number>>(key);
      const counts = { ...(cur?.value ?? {}) };
      counts[`${e.name}${dim}`] = (counts[`${e.name}${dim}`] ?? 0) + 1;
      if (await kv.setJSON(key, counts, cur ? { ifMatch: cur.etag } : { onlyIfNew: true })) break;
    }
  } catch {
    /* evento descartado */
  }
  return new Response(null, { status: 204 });
};
