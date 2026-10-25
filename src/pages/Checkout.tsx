import { ArrowLeft, Check, FlaskConical, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, LinkButton } from '../components/ui';
import { IS_DEMO, APP_ENV } from '../config/env';
import { PRODUCTS } from '../data/plans';
import { track } from '../lib/analytics';
import { api } from '../lib/api';
import { loadQuiz, newId, saveOrder } from '../lib/storage';

const STEPS = [
  'Pagamento em ambiente da plataforma de pagamento. A confirmação vem da própria plataforma, não deste site.',
  'Aprofundamento opcional: gere com o que já informou ou responda blocos curtos (pule o que não souber).',
  'O sistema monta e confere o plano. Só mostramos “pronto” quando o PDF existe e passou na verificação.',
  'Download protegido do PDF. Se algo falhar, avisamos com honestidade e indicamos o suporte.',
];

export default function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const product = params.get('produto') === 'especialista' ? PRODUCTS.especialista : PRODUCTS.plano;
  const quiz = useMemo(() => loadQuiz(), []);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!quiz?.completedAt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Primeiro, o diagnóstico gratuito</h1>
        <p className="mt-2 text-ink-soft">O plano é montado a partir das suas respostas. Leva poucos minutos.</p>
        <LinkButton to="/diagnostico" size="lg" className="mt-6">Fazer o diagnóstico</LinkButton>
      </div>
    );
  }

  const start = async () => {
    setError(undefined);
    track('checkout_inicio', { plan: product.id });
    const links = typeof quiz.answers.link === 'string' && quiz.answers.link ? [{ url: quiz.answers.link, status: 'informado' as const }] : [];
    if (IS_DEMO) {
      const id = newId('demo');
      saveOrder({ id, product: product.id === 'especialista' ? 'especialista' : 'plano', environment: 'demo', diagnosticId: quiz.sessionId, answers: quiz.answers, links, status: 'aguardando_pagamento', createdAt: new Date().toISOString() });
      navigate(`/pedido/${id}`);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Informe um e-mail válido para receber o acesso ao plano.');
    setBusy(true);
    try {
      const r = await api.createOrder({ product: product.id === 'especialista' ? 'especialista' : 'plano', diagnosticId: quiz.sessionId, answers: quiz.answers, links, contact: { email } });
      saveOrder({ id: r.orderId, accessToken: r.accessToken, product: 'plano', environment: APP_ENV, diagnosticId: quiz.sessionId, answers: quiz.answers, links, status: 'aguardando_pagamento', createdAt: new Date().toISOString() });
      window.location.href = r.checkoutUrl;
    } catch (e) {
      setError(`Não foi possível iniciar o pagamento agora (${e instanceof Error ? e.message : 'erro'}). Nada foi cobrado. Tente novamente em instantes.`);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
      <Link to="/planos" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar aos planos
      </Link>
      {IS_DEMO && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-warn bg-warn-50 p-5 text-center" role="note">
          <FlaskConical className="mx-auto h-7 w-7 text-warn-700" aria-hidden />
          <p className="mt-2 text-lg font-extrabold uppercase tracking-wide text-warn-700">Demonstração — nenhum pagamento será cobrado</p>
          <p className="mt-1 text-sm text-warn-700">Esta versão simula o fluxo no seu navegador. Não há cobrança, pagamento nem envio de dados.</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <Card className="p-6">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="mt-1 text-ink-soft">{product.tagline}</p>
          <h2 className="mt-6 font-bold">Como funciona depois do pagamento</h2>
          <ol className="mt-2 space-y-2 text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="flex flex-col p-6">
          <p className="text-sm text-ink-soft">Valor</p>
          <p className="tabular text-3xl font-extrabold">{product.price}</p>
          <p className="text-xs text-ink-mute">{product.priceNote}</p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {product.features.slice(0, 3).map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{f}</li>
            ))}
          </ul>
          {!IS_DEMO && (
            <div className="mt-4">
              <label htmlFor="email" className="label">E-mail para acesso ao plano</label>
              <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="mt-1 text-xs text-ink-mute">Usado só para entrega e suporte. Não é enviado à IA.</p>
            </div>
          )}
          <div className="mt-6 flex-1" />
          {error && <p role="alert" className="mb-3 text-sm text-bad-700">{error}</p>}
          <Button size="lg" className="h-auto w-full py-3" onClick={start} disabled={busy}>
            {IS_DEMO ? 'Simular pedido (demonstração)' : <><Lock className="h-4 w-4" aria-hidden /> Ir para o pagamento</>}
          </Button>
        </Card>
      </div>
    </div>
  );
}
