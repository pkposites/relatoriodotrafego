import { ArrowLeft, Check, FlaskConical, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button, Card, LinkButton } from '../components/ui';
import { getPlan } from '../data/plans';
import { loadQuiz, newId, upsertLocalLead } from '../lib/storage';

export default function CheckoutDemo() {
  const [params] = useSearchParams();
  const plan = getPlan(params.get('plano'));
  const quiz = useMemo(() => loadQuiz(), []);
  const [registered, setRegistered] = useState(false);

  if (!plan || plan.id === 'consultoria') return <Navigate to="/planos" replace />;

  const register = () => {
    upsertLocalLead({
      id: quiz?.sessionId ?? newId('sim'),
      plan: plan.id,
      ...(quiz?.completedAt ? { answers: quiz.answers, metrics: quiz.metrics } : {}),
    });
    setRegistered(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
      <Link to="/planos" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar aos planos
      </Link>

      <div className="mb-6 rounded-2xl border-2 border-dashed border-warn bg-warn-50 p-5 text-center" role="note">
        <FlaskConical className="mx-auto h-7 w-7 text-warn-700" aria-hidden />
        <p className="mt-2 text-lg font-extrabold uppercase tracking-wide text-warn-700 sm:text-xl">
          Demonstração — nenhum pagamento será cobrado
        </p>
        <p className="mt-1 text-sm text-warn-700">Esta tela simula a etapa de contratação. Não há checkout, cartão ou gateway conectado.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Resumo do pedido (simulado)</p>
          <h1 className="mt-1 text-2xl font-bold">{plan.name}</h1>
          <ul className="mt-4 space-y-2 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl bg-canvas p-4 text-sm text-ink-soft">
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Na versão futura, o pagamento será feito em ambiente seguro de terceiros e a entrega acontecerá somente após a confirmação.
            </p>
          </div>
          {!quiz?.completedAt && (
            <p className="mt-4 text-sm text-warn-700">
              Você ainda não concluiu o diagnóstico gratuito. <Link to="/diagnostico" className="font-semibold underline">Responder agora</Link>
            </p>
          )}
        </Card>

        <Card className="flex flex-col p-6">
          <p className="text-sm text-ink-soft">Valor do plano</p>
          <p className="tabular text-3xl font-extrabold">{plan.price}</p>
          <p className="text-xs text-ink-mute">{plan.priceNote}</p>
          <div className="mt-6 flex-1" />
          {registered ? (
            <div role="status" className="rounded-xl border border-ok bg-ok-50 p-4 text-sm text-[#067647]">
              <p className="font-bold">Simulação registrada neste navegador.</p>
              <p className="mt-1">Nenhum pagamento foi processado e nenhum dado foi enviado.</p>
            </div>
          ) : (
            <Button size="lg" onClick={register} className="w-full">
              Simular contratação
            </Button>
          )}
          <LinkButton to="/admin-demo" variant="ghost" className="mt-3 w-full text-sm">
            Ver no painel de demonstração
          </LinkButton>
        </Card>
      </div>
    </div>
  );
}
