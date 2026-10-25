import { guard, json } from './_lib/http';
import { getOrder, getPdf, verifyDownload } from './_lib/orders';
import { runtimeDeps } from './_lib/runtime';

/** GET: download protegido por assinatura com validade. */
export default async (req: Request) => {
  const off = guard();
  if (off) return off;
  const u = new URL(req.url);
  const id = u.searchParams.get('id') ?? '';
  const d = await runtimeDeps();
  if (!verifyDownload(d.cfg.downloadSecret, id, Number(u.searchParams.get('exp')), u.searchParams.get('sig') ?? '', new Date())) return json(403, { error: 'Link inválido ou expirado. Gere um novo na página do pedido.' });
  const o = await getOrder(d, id);
  const pdf = o && o.status === 'concluido' ? await getPdf(d, o) : null;
  if (!pdf) return json(404, { error: 'Arquivo indisponível.' });
  return new Response(pdf, { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="plano-de-acao-${id}.pdf"`, 'cache-control': 'private, no-store' } });
};
