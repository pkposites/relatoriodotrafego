import { guard, handleError, json } from './_lib/http';
import { submitDeepening } from './_lib/orders';
import { runtimeDeps } from './_lib/runtime';

/** POST: recebe o aprofundamento (ou "gerar com o que já informei") e dispara a geração em segundo plano. */
export default async (req: Request) => {
  const off = guard();
  if (off) return off;
  if (req.method !== 'POST') return json(405, { error: 'Método não permitido.' });
  try {
    const b = await req.json();
    const d = await runtimeDeps();
    const o = await submitDeepening(d, String(b.id), String(b.token), b.deepening ?? {}, b.metrics);
    await fetch(`${d.cfg.publicBaseUrl}/.netlify/functions/generate-plan-background`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': d.cfg.internalSecret },
      body: JSON.stringify({ id: o.id }),
    }).catch((e) => console.error('[disparo geração]', e));
    return json(202, { status: o.status });
  } catch (e) {
    return handleError(e);
  }
};
