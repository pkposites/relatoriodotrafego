import { guard, handleError, json } from './_lib/http';
import { handlePayment } from './_lib/orders';
import { ProviderNotConfigured, SignatureError, verifyAndParse } from './_lib/payment';
import { runtimeDeps } from './_lib/runtime';

/** Notificação do provedor de pagamento. Verifica autenticidade antes de qualquer efeito; idempotente por id do evento. */
export default async (req: Request) => {
  const off = guard();
  if (off) return off;
  if (req.method !== 'POST') return json(405, { error: 'Método não permitido.' });
  const raw = await req.text();
  try {
    const d = await runtimeDeps();
    const ev = verifyAndParse(raw, req.headers, d.cfg.payment);
    const r = await handlePayment(d, ev);
    return json(200, { ok: true, result: r.result });
  } catch (e) {
    if (e instanceof SignatureError) return json(401, { error: 'Assinatura inválida.' });
    if (e instanceof ProviderNotConfigured) return json(501, { error: e.message });
    return handleError(e);
  }
};
