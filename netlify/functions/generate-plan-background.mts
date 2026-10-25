import { timingSafeEqual } from 'node:crypto';
import { guard } from './_lib/http';
import { runGeneration } from './_lib/orders';
import { runtimeDeps } from './_lib/runtime';

/** Função em segundo plano (sufixo -background): gera, valida, renderiza e guarda o PDF. Só aceita chamadas internas. */
export default async (req: Request) => {
  if (guard()) return;
  const d = await runtimeDeps();
  const got = Buffer.from(req.headers.get('x-internal-secret') ?? '');
  const want = Buffer.from(d.cfg.internalSecret);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return;
  const { id } = await req.json();
  const o = await runGeneration(d, String(id));
  console.log('[geração]', id, o?.status ?? 'sem mudança');
};
