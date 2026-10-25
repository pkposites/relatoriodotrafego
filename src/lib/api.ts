import { API_BASE } from '../config/env';
import type { Answers, LinkEvidence, MetricsInput } from '../domain/types';

/** Cliente das funções do servidor (somente produção/teste). */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}`, { headers: { 'content-type': 'application/json' }, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Falha (${res.status})`);
  return body as T;
}

export const api = {
  createOrder: (b: { product: 'plano' | 'especialista'; diagnosticId: string; answers: Answers; links: LinkEvidence[]; contact: { email: string } }) =>
    call<{ orderId: string; accessToken: string; checkoutUrl: string }>('orders-create', { method: 'POST', body: JSON.stringify(b) }),
  status: (id: string, token: string) =>
    call<{ status: string; message?: string; downloadUrl?: string; plan?: unknown }>(`order-status?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`),
  deepening: (id: string, token: string, deepening: Answers, metrics?: MetricsInput) =>
    call<{ status: string }>('order-deepening', { method: 'POST', body: JSON.stringify({ id, token, deepening, metrics }) }),
};
