/**
 * Configuração do servidor, lida SOMENTE de variáveis de ambiente da Netlify.
 * Nenhuma chave fica no código ou no navegador. Ver docs/pendencias-externas.md.
 */
export interface ServerConfig {
  mode: 'demo' | 'test' | 'production';
  publicBaseUrl: string;
  openai: { apiKey: string; model: string; maxOutputTokens: number; timeoutMs: number; maxAttempts: number };
  payment: {
    provider: 'hmac_generico' | 'mercadopago';
    webhookSecret: string;
    signatureHeader: string;
    refParam: string;
    checkoutUrls: { plano: string; especialista: string };
    expectedCents: { plano: number; especialista: number };
    /** Só com provider "mercadopago". Token de acesso da aplicação (servidor). */
    mpAccessToken: string;
  };
  /**
   * Cobrança ligada? PAYWALL=off libera o Plano sem pagamento (com limites diários).
   * Padrão: ligada, para que um erro de configuração nunca libere o produto pago.
   */
  paywall: boolean;
  free: { dailyLimit: number; perIpDay: number; perEmailDay: number };
  /** Cloudflare Turnstile (verificação anti-robô no pedido). Vazio = desligado. */
  turnstileSecret: string;
  downloadSecret: string;
  internalSecret: string;
  supportContact: string | null;
  allowDeterministicFallback: boolean;
}

export class ConfigError extends Error {
  constructor(public missing: string[]) {
    super(`Configuração ausente: ${missing.join(', ')}`);
  }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const mode = env.APP_MODE === 'production' || env.APP_MODE === 'test' ? env.APP_MODE : 'demo';
  const req = (k: string) => env[k] ?? '';
  const missing: string[] = [];
  const need = (k: string) => {
    if (!env[k]) missing.push(k);
    return req(k);
  };
  const mp = env.PAYMENT_PROVIDER === 'mercadopago';
  const paywall = env.PAYWALL !== 'off';
  const int = (v: string | undefined, def: number, max: number) => Math.max(0, Math.min(max, Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Math.floor(Number(v)) : def));
  const cfg: ServerConfig = {
    mode,
    publicBaseUrl: mode === 'demo' ? '' : need('PUBLIC_BASE_URL'),
    openai: {
      apiKey: mode === 'demo' ? '' : need('OPENAI_API_KEY'),
      model: mode === 'demo' ? '' : need('OPENAI_MODEL'),
      maxOutputTokens: Number(env.OPENAI_MAX_OUTPUT_TOKENS ?? 12000),
      timeoutMs: Number(env.OPENAI_TIMEOUT_MS ?? 120000),
      maxAttempts: Math.min(3, Number(env.OPENAI_MAX_ATTEMPTS ?? 2)),
    },
    payment: {
      provider: mp ? 'mercadopago' : 'hmac_generico',
      webhookSecret: mode === 'demo' || !paywall ? req(mp ? 'MP_WEBHOOK_SECRET' : 'PAYMENT_WEBHOOK_SECRET') : need(mp ? 'MP_WEBHOOK_SECRET' : 'PAYMENT_WEBHOOK_SECRET'),
      signatureHeader: (env.PAYMENT_SIGNATURE_HEADER ?? 'x-signature').toLowerCase(),
      refParam: env.PAYMENT_REF_PARAM ?? 'ref',
      // Com Mercado Pago o link é criado por pedido; não há link fixo.
      checkoutUrls: { plano: mode === 'demo' || mp || !paywall ? req('CHECKOUT_URL_PLANO') : need('CHECKOUT_URL_PLANO'), especialista: req('CHECKOUT_URL_ESPECIALISTA') },
      expectedCents: { plano: Number(env.PRICE_CENTS_PLANO ?? 6790), especialista: Number(env.PRICE_CENTS_ESPECIALISTA ?? 19700) },
      mpAccessToken: mode === 'demo' || !mp || !paywall ? req('MP_ACCESS_TOKEN') : need('MP_ACCESS_TOKEN'),
    },
    paywall,
    // Limites do acesso gratuito: travam o custo máximo da IA por dia.
    turnstileSecret: req('TURNSTILE_SECRET_KEY'),
    free: { dailyLimit: int(env.FREE_DAILY_LIMIT, 30, 500), perIpDay: int(env.FREE_PER_IP_DAY, 2, 20), perEmailDay: int(env.FREE_PER_EMAIL_DAY, 1, 10) },
    downloadSecret: mode === 'demo' ? '' : need('DOWNLOAD_SIGNING_SECRET'),
    internalSecret: mode === 'demo' ? '' : need('INTERNAL_TASK_SECRET'),
    supportContact: env.SUPPORT_CONTACT ?? null,
    allowDeterministicFallback: env.ALLOW_DETERMINISTIC_FALLBACK === 'true',
  };
  if (missing.length) throw new ConfigError(missing);
  return cfg;
}
