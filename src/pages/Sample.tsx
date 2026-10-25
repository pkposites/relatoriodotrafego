import { Download, FlaskConical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PlanView } from '../components/PlanView';
import { Button, LinkButton } from '../components/ui';
import { PROFILES } from '../domain/profiles';
import { track } from '../lib/analytics';
import { buildAll, pdfMeta } from '../lib/planBuilder';
import { buildPlanDocument } from '../pdf/planDocument';
import { downloadPdf } from '../pdf/renderBrowser';

const SAMPLES = ['local_whatsapp', 'ecommerce_metrics', 'b2b_long'] as const;
const LABEL = 'EXEMPLO FICTÍCIO — dados inventados';

/** Amostra demonstrativa com dados fictícios claramente identificados. */
export default function Sample() {
  const [id, setId] = useState<(typeof SAMPLES)[number]>('local_whatsapp');
  const p = PROFILES[id];
  const built = useMemo(() => buildAll({ id: `exemplo-${id}`, environment: 'demo', answers: p.answers, metrics: p.metrics, hasDeepening: true, createdAt: '2026-10-25T12:00:00.000Z' }), [id, p]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-dashed border-warn bg-warn-50 p-4 text-sm text-warn-700" role="note">
        <FlaskConical className="h-5 w-5 shrink-0" aria-hidden />
        <p>
          <strong>Exemplo fictício.</strong> Empresas, números e respostas foram inventados para mostrar o formato do Plano de Ação do Tráfego. Não são clientes reais nem resultados obtidos.
        </p>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">Veja um plano de exemplo</h1>
      <p className="mt-2 text-ink-soft">Três negócios fictícios, com caminhos de venda diferentes. O conteúdo muda conforme as respostas e os números informados.</p>

      <div role="tablist" aria-label="Exemplos" className="mt-5 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s}
            role="tab"
            type="button"
            aria-selected={id === s}
            onClick={() => setId(s)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${id === s ? 'border-brand bg-brand-50 text-brand-700' : 'border-line bg-white hover:border-[#B2CCFF]'}`}
          >
            {PROFILES[s].name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-soft">{p.description}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={async () => {
            track('download', { source: 'amostra' });
            await downloadPdf(buildPlanDocument(built.plan, pdfMeta(built.d, p.answers, { sampleLabel: LABEL })), `exemplo-plano-de-acao-${id}.pdf`);
          }}
        >
          <Download className="h-4 w-4" aria-hidden /> Baixar este exemplo em PDF
        </Button>
        <LinkButton to="/diagnostico">Fazer meu diagnóstico gratuito</LinkButton>
      </div>

      <div className="mt-6">
        <PlanView plan={built.plan} />
      </div>
    </div>
  );
}
