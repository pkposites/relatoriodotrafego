import { aiTestEnv, authorized, RUN_ID } from './_lib/aiTest';
import { json } from './_lib/http';
import { blobsKV } from './_lib/store';

/** GET ?run=<id>[&pdf=1] com x-internal-secret: resultado do teste da IA. */
export default async (req: Request) => {
  const cfg = aiTestEnv();
  if (!cfg) return json(503, { error: 'Faltam OPENAI_API_KEY, OPENAI_MODEL ou INTERNAL_TASK_SECRET no Netlify.' });
  if (!authorized(req, cfg.internalSecret)) return json(403, { error: 'Acesso negado.' });
  const url = new URL(req.url);
  const run = url.searchParams.get('run') ?? '';
  if (!RUN_ID.test(run)) return json(400, { error: 'run inválido.' });
  const kv = await blobsKV('relatorio-do-trafego');
  if (url.searchParams.get('pdf')) {
    const pdf = await kv.getBytes(`ai-test/${run}.pdf`);
    return pdf ? new Response(pdf, { headers: { 'content-type': 'application/pdf', 'cache-control': 'no-store' } }) : json(404, { error: 'PDF ainda não existe.' });
  }
  const r = await kv.getJSON(`ai-test/${run}`);
  return r ? json(200, r.value) : json(404, { error: 'Teste não encontrado (ainda na fila?).' });
};
