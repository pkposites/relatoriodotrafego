import { guard, handleError, json } from './_lib/http';
import { createOrder } from './_lib/orders';
import { runtimeDeps } from './_lib/runtime';
import { verifyTurnstile } from './_lib/turnstile';

/** IP do visitante informado pela Netlify (não confia em cabeçalhos enviados pelo navegador). */
function clientIp(req: Request, context?: { ip?: string }) {
  return context?.ip || req.headers.get('x-nf-client-connection-ip') || '';
}

/**
 * POST: cria o pedido. Com cobrança ligada, devolve a URL do checkout do provedor;
 * com PAYWALL=off, o Plano já sai liberado (checkoutUrl nulo), dentro dos limites diários.
 */
export default async (req: Request, context?: { ip?: string }) => {
  const off = guard();
  if (off) return off;
  if (req.method !== 'POST') return json(405, { error: 'Método não permitido.' });
  try {
    const body = await req.json();
    const d = await runtimeDeps();
    const ip = clientIp(req, context);
    await verifyTurnstile(d.cfg.turnstileSecret, body.turnstileToken, ip);
    const r = await createOrder(d, { product: body.product, diagnosticId: body.diagnosticId, answers: body.answers, links: body.links ?? [], email: body.contact?.email, clientIp: ip });
    return json(201, { orderId: r.order.id, accessToken: r.accessToken, checkoutUrl: r.checkoutUrl, status: r.order.status, access: r.order.access });
  } catch (e) {
    return handleError(e);
  }
};
