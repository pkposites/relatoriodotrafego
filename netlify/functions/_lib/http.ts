import { ConfigError, loadConfig } from './config';
import { OrderError } from './orders';

export const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** Funções reais ficam desligadas no modo demonstração. */
export function guard(): Response | null {
  try {
    const cfg = loadConfig();
    if (cfg.mode === 'demo') return json(404, { error: 'Indisponível na demonstração.' });
    return null;
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error('[config]', e.missing.join(','));
      return json(503, { error: 'Serviço ainda não configurado. Nada foi cobrado.' });
    }
    throw e;
  }
}

export function handleError(e: unknown): Response {
  if (e instanceof OrderError) return json(e.code === 'nao_encontrado' ? 404 : e.code === 'nao_autorizado' ? 403 : 400, { error: e.message });
  console.error('[erro]', e instanceof Error ? e.message : e);
  return json(500, { error: 'Erro inesperado. Tente novamente em instantes.' });
}
