import { guard, handleError, json } from './_lib/http';
import { createOrder } from './_lib/orders';
import { runtimeDeps } from './_lib/runtime';

/** POST: cria o pedido e devolve a URL do checkout do provedor (com a referência do pedido). */
export default async (req: Request) => {
  const off = guard();
  if (off) return off;
  if (req.method !== 'POST') return json(405, { error: 'Método não permitido.' });
  try {
    const body = await req.json();
    const d = await runtimeDeps();
    const r = await createOrder(d, { product: body.product, diagnosticId: body.diagnosticId, answers: body.answers, links: body.links ?? [], email: body.contact?.email });
    return json(201, { orderId: r.order.id, accessToken: r.accessToken, checkoutUrl: r.checkoutUrl });
  } catch (e) {
    return handleError(e);
  }
};
