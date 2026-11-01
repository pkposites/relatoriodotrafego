import type { AppEnvironment } from '../domain/types';

/**
 * Ambiente da aplicação. Padrão: "demo" (nada é enviado a servidores).
 * Produção exige VITE_APP_MODE=production e as funções do servidor configuradas
 * (ver docs/pendencias-externas.md).
 */
const raw = (import.meta.env?.VITE_APP_MODE as string | undefined) ?? 'demo';
export const APP_ENV: AppEnvironment = raw === 'production' || raw === 'test' ? raw : 'demo';
export const IS_DEMO = APP_ENV === 'demo';
export const SUPPORT_CONTACT = (import.meta.env?.VITE_SUPPORT_CONTACT as string | undefined) ?? null;
/** Prazo de entrega do especialista — só exibido quando configurado. */
export const SPECIALIST_DEADLINE = (import.meta.env?.VITE_SPECIALIST_DEADLINE as string | undefined) ?? null;
export const API_BASE = '/.netlify/functions';
/**
 * Cobrança do Plano. VITE_PAYWALL=off libera o Plano sem pagamento (limites diários no servidor).
 * Padrão: ligada. Para voltar a cobrar, basta remover/alterar a variável e publicar.
 */
export const PAYWALL_ON = ((import.meta.env?.VITE_PAYWALL as string | undefined) ?? 'on') !== 'off';
/** Plano liberado sem pagamento (só fora da demonstração). */
export const IS_FREE = !IS_DEMO && !PAYWALL_ON;
/** Chave pública do Cloudflare Turnstile (anti-robô no pedido). Vazio = desligado. */
export const TURNSTILE_SITE_KEY = ((import.meta.env?.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '').trim();
