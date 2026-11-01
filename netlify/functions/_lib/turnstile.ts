import { OrderError } from './orders';

/** Confere o token do Cloudflare Turnstile no servidor (siteverify). Sem segredo configurado, não faz nada. */
export async function verifyTurnstile(secret: string, token: unknown, ip: string, fetchFn: typeof fetch = fetch) {
  if (!secret) return;
  if (typeof token !== 'string' || !token || token.length > 2048) throw new OrderError('dados_invalidos', 'Confirme que você não é um robô e tente de novo.');
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  let ok = false;
  try {
    const r = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, signal: AbortSignal.timeout(5000) });
    ok = r.ok && ((await r.json()) as { success?: boolean }).success === true;
  } catch {
    ok = false;
  }
  if (!ok) throw new OrderError('dados_invalidos', 'Não foi possível confirmar que você não é um robô. Recarregue a página e tente de novo.');
}
