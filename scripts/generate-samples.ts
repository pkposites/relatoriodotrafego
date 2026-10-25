/**
 * Gera os relatórios fictícios de avaliação em docs/exemplos/.
 * Uso: npm run samples
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildDiagnostic } from '../src/domain/diagnostic';
import { buildPlan } from '../src/domain/plan';
import { PROFILES } from '../src/domain/profiles';
import { VERSIONS } from '../src/domain/versions';
import { buildModelInput } from '../src/ai/modelInput';
import { validatePlan } from '../src/ai/validate';
import { buildPlanDocument } from '../src/pdf/planDocument';
import { renderPdfNode } from '../src/pdf/renderNode';

const OUT = 'docs/exemplos';
const SAMPLES = ['local_whatsapp', 'ecommerce_metrics', 'b2b_long'];

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const id of SAMPLES) {
    const p = PROFILES[id];
    const d = buildDiagnostic({ id: `exemplo-${id}`, environment: 'demo', answers: p.answers, metrics: p.metrics, createdAt: '2026-10-25T12:00:00.000Z', hasDeepening: true });
    const plan = buildPlan(d, p.answers);
    const v = validatePlan(plan, buildModelInput(d, p.answers));
    if (!v.ok) throw new Error(`${id}: plano inválido: ${v.errors.join(' | ')}`);
    const doc = buildPlanDocument(plan, {
      businessLabel: `${p.name} (negócio fictício)`,
      generatedAt: d.record.created_at,
      period: d.record.metrics.period,
      versions: { report: VERSIONS.report, scoring: VERSIONS.scoring, prompt: VERSIONS.prompt, questionnaire: VERSIONS.questionnaire },
      generation: { mode: 'deterministico' },
      environment: 'demo',
      sampleLabel: 'EXEMPLO FICTÍCIO — dados inventados para avaliação',
    });
    writeFileSync(`${OUT}/${id}.pdf`, await renderPdfNode(doc));
    writeFileSync(`${OUT}/${id}.plano.json`, JSON.stringify(plan, null, 2));
    writeFileSync(`${OUT}/${id}.diagnostico.json`, JSON.stringify(d.record, null, 2));
    console.log(`ok ${id}: ${plan.priorities.length} prioridades, ${plan.indicators.length} indicadores`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
