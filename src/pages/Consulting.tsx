import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, DemoBanner, LinkButton } from '../components/ui';
import { IS_DEMO } from '../config/env';
import { fieldOptions, getField, str } from '../domain/questionnaire';
import { track } from '../lib/analytics';
import { loadQuiz, newId, saveConsulting } from '../lib/storage';

type Channel = 'whatsapp' | 'email' | 'ligacao';
const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'E-mail' },
  { id: 'ligacao', label: 'Ligação' },
];
type Errors = Partial<Record<'name' | 'company' | 'budget' | 'difficulty' | 'channel' | 'phone' | 'email', string>>;

export function validPhone(v: string) {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

export default function Consulting() {
  const quiz = useMemo(() => loadQuiz(), []);
  const budgets = fieldOptions(getField('orcamento')!, { campanhas_status: 'ativas' });
  const difficulties = fieldOptions(getField('dor')!, { campanhas_status: 'ativas' });
  const [f, setF] = useState({
    name: '',
    company: '',
    budget: (quiz && str(quiz.answers, 'orcamento')) ?? '',
    difficulty: (quiz && str(quiz.answers, 'dor')) ?? '',
    channel: '' as Channel | '',
    phone: '',
    email: '',
    message: '',
    marketingOptIn: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Errors = {};
    if (!f.name.trim()) err.name = 'Informe seu nome.';
    if (!f.company.trim()) err.company = 'Informe o nome da empresa.';
    if (!f.budget) err.budget = 'Selecione uma faixa.';
    if (!f.difficulty) err.difficulty = 'Selecione a principal dificuldade.';
    if (!f.channel) err.channel = 'Escolha como prefere o retorno.';
    if ((f.channel === 'whatsapp' || f.channel === 'ligacao') && !validPhone(f.phone)) err.phone = 'Informe um número com DDD.';
    if (f.channel === 'email' && !/^\S+@\S+\.\S+$/.test(f.email)) err.email = 'Informe um e-mail válido.';
    setErrors(err);
    const first = Object.keys(err)[0];
    if (first) return document.getElementById(`f-${first}`)?.focus();
    saveConsulting({
      id: newId('cons'),
      createdAt: new Date().toISOString(),
      diagnosticId: quiz?.completedAt ? quiz.sessionId : undefined,
      contact: {
        name: f.name.trim(),
        company: f.company.trim(),
        channel: f.channel as Channel,
        phone: f.channel === 'email' ? undefined : f.phone.trim(),
        email: f.channel === 'email' ? f.email.trim() : undefined,
      },
      budget: f.budget,
      difficulty: f.difficulty,
      message: f.message.trim() || undefined,
      marketingOptIn: f.marketingOptIn,
    });
    track('oferta_clique', { plan: 'consultoria', source: 'formulario' });
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <CheckCircle2 className="mx-auto h-12 w-12 text-ok" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold" role="status">
          {IS_DEMO ? 'Solicitação de demonstração registrada neste navegador.' : 'Solicitação registrada.'}
        </h1>
        <p className="mt-2 text-ink-soft">{IS_DEMO ? 'Nenhuma mensagem foi enviada. Nesta fase não há agenda nem retorno automático.' : 'O retorno será feito pelo canal que você escolheu.'}</p>
        <LinkButton to="/" variant="secondary" className="mt-6">Voltar ao início</LinkButton>
      </div>
    );
  }

  const field = (k: keyof Errors) => ({ id: `f-${k}`, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `e-${k}` : undefined });
  const Err = ({ k }: { k: keyof Errors }) => (errors[k] ? <p id={`e-${k}`} className="mt-1.5 text-xs font-semibold text-bad-700">{errors[k]}</p> : null);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6 sm:pt-12">
      <Link to="/planos" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar aos planos
      </Link>
      <p className="text-xs font-bold uppercase tracking-wider text-brand">Consultoria sob medida</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Solicitar conversa inicial</h1>
      <p className="mt-2 text-ink-soft">A conversa inicial não tem custo. Qualquer proposta vem com escopo e preço antes de pagamento.</p>
      {IS_DEMO && (
        <div className="mt-5">
          <DemoBanner>
            <strong>Formulário de demonstração.</strong> Os dados ficam só neste navegador e nada é enviado. Para testar, use dados fictícios.
          </DemoBanner>
        </div>
      )}
      <Card className="mt-6 p-5 sm:p-6">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="f-name" className="label">Nome</label>
              <input className="input" autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} {...field('name')} />
              <Err k="name" />
            </div>
            <div>
              <label htmlFor="f-company" className="label">Empresa</label>
              <input className="input" autoComplete="organization" value={f.company} onChange={(e) => set('company', e.target.value)} {...field('company')} />
              <Err k="company" />
            </div>
          </div>
          <div>
            <label htmlFor="f-budget" className="label">Investimento mensal em anúncios</label>
            <select className="input" value={f.budget} onChange={(e) => set('budget', e.target.value)} {...field('budget')}>
              <option value="">Selecione</option>
              {budgets.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Err k="budget" />
          </div>
          <div>
            <label htmlFor="f-difficulty" className="label">Principal dificuldade</label>
            <select className="input" value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)} {...field('difficulty')}>
              <option value="">Selecione</option>
              {difficulties.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <Err k="difficulty" />
          </div>
          <fieldset>
            <legend className="label">Como prefere o retorno</legend>
            <div role="radiogroup" className="flex flex-wrap gap-2" id="f-channel" tabIndex={-1}>
              {CHANNELS.map((c) => (
                <label key={c.id} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold focus-within:ring-2 focus-within:ring-brand ${f.channel === c.id ? 'border-brand bg-brand-50 text-brand-700' : 'border-line bg-white hover:border-[#B2CCFF]'}`}>
                  <input type="radio" name="channel" value={c.id} checked={f.channel === c.id} onChange={() => set('channel', c.id)} className="sr-only" />
                  {c.label}
                </label>
              ))}
            </div>
            <Err k="channel" />
          </fieldset>
          {(f.channel === 'whatsapp' || f.channel === 'ligacao') && (
            <div className="anim-rise">
              <label htmlFor="f-phone" className="label">{f.channel === 'whatsapp' ? 'Número do WhatsApp (com DDD)' : 'Telefone (com DDD)'}</label>
              <input type="tel" inputMode="tel" autoComplete="tel" className="input sm:max-w-xs" placeholder="(11) 91234-5678" value={f.phone} onChange={(e) => set('phone', e.target.value)} {...field('phone')} />
              <Err k="phone" />
            </div>
          )}
          {f.channel === 'email' && (
            <div className="anim-rise">
              <label htmlFor="f-email" className="label">E-mail</label>
              <input type="email" autoComplete="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} {...field('email')} />
              <Err k="email" />
            </div>
          )}
          <div>
            <label htmlFor="f-message" className="label">Algo mais que queira contar? <span className="font-normal text-ink-mute">(opcional)</span></label>
            <textarea id="f-message" rows={3} maxLength={600} className="input resize-y" value={f.message} onChange={(e) => set('message', e.target.value)} />
          </div>
          <div className="rounded-xl bg-canvas p-4 text-sm">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={f.marketingOptIn} onChange={(e) => set('marketingOptIn', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line accent-brand" />
              <span>Aceito receber comunicações comerciais da Qvn Ads. (Opcional — pode cancelar quando quiser.)</span>
            </label>
            <p className="mt-3 text-xs text-ink-mute">
              Seus dados de contato são usados só para responder a esta solicitação e ficam separados das respostas do diagnóstico. <Link to="/privacidade" className="font-semibold underline">Aviso de privacidade</Link>.
            </p>
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto sm:justify-self-start">
            {IS_DEMO ? 'Registrar solicitação (demonstração)' : 'Enviar solicitação'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
