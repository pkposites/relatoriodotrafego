import { guard, handleError, json } from './_lib/http';
import { authorize, getOrder, needsRetry, statusView } from './_lib/orders';
import { runtimeDeps } from './_lib/runtime';

/** GET: estado do pedido para quem tem o token de acesso. Retoma gerações paradas (recuperação). */
export default async (req: Request) => {
  const off = guard();
  if (off) return off;
  try {
    const u = new URL(req.url);
    const d = await runtimeDeps();
    const o = await getOrder(d, u.searchParams.get('id') ?? '');
    if (!o) return json(404, { error: 'Pedido não encontrado.' });
    authorize(o, u.searchParams.get('token') ?? '');
    if (needsRetry(o, new Date())) {
      await fetch(`${d.cfg.publicBaseUrl}/.netlify/functions/generate-plan-background`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-secret': d.cfg.internalSecret },
        body: JSON.stringify({ id: o.id }),
      }).catch(() => undefined);
    }
    return json(200, statusView(d, o));
  } catch (e) {
    return handleError(e);
  }
};
