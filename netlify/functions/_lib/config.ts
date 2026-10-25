/**
 * Configuração do servidor, lida SOMENTE de variáveis de ambiente da Netlify.
 * Nenhuma chave fica no código ou no navegador. Ver docs/pendencias-externas.md.
 */
export interface ServerConfig {
  mode: 'demo' | 'test' | 'production';
  publicBaseUrl: string;
  openai: { apiKey: string; model: string; maxOutputTokens: number; timeoutMs: number; maxAttempts: number };
  payment: { provider: 'hmac_generico' | 'kiwify'; webhookSecret: string; signatureHeader: string; refParam: string; checkoutUrls: { plano: string; especialista: string }; expectedCents: { plano: number; especialista: number } };
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
      provider: env.PAYMENT_PROVIDER === 'kiwify' ? 'kiwify' : 'hmac_generico',
      webhookSecret: mode === 'demo' ? '' : need('PAYMENT_WEBHOOK_SECRET'),
      signatureHeader: (env.PAYMENT_SIGNATURE_HEADER ?? 'x-signature').toLowerCase(),
      refParam: env.PAYMENT_REF_PARAM ?? 'ref',
      checkoutUrls: { plano: mode === 'demo' ? '' : need('CHECKOUT_URL_PLANO'), especialista: req('CHECKOUT_URL_ESPECIALISTA') },
      expectedCents: { plano: Number(env.PRICE_CENTS_PLANO ?? 6790), especialista: Number(env.PRICE_CENTS_ESPECIALISTA ?? 19700) },
    },
    downloadSecret: mode === 'demo' ? '' : need('DOWNLOAD_SIGNING_SECRET'),
    internalSecret: mode === 'demo' ? '' : need('INTERNAL_TASK_SECRET'),
    supportContact: env.SUPPORT_CONTACT ?? null,
    allowDeterministicFallback: env.ALLOW_DETERMINISTIC_FALLBACK === 'true',
  };
  if (missing.length) throw new ConfigError(missing);
  return cfg;
}
