import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, DemoBanner, LinkButton } from '../components/ui';
import { getQuestion } from '../data/questions';
import { loadQuiz, newId, upsertLocalLead } from '../lib/storage';
import type { ConsultingRequest } from '../types';

const BUDGETS = getQuestion('q2')!.options;
const DIFFICULTIES = getQuestion('q4')!.options;
const CHANNELS = ['WhatsApp', 'E-mail', 'Ligação'];

type Errors = Partial<Record<keyof ConsultingRequest, string>>;

export default function Consulting() {
  const quiz = useMemo(() => loadQuiz(), []);
  const [form, setForm] = useState<ConsultingRequest>({
    name: '',
    company: '',
    budget: quiz?.answers.q2 ?? '',
    difficulty: quiz?.answers.q4 ?? '',
    channel: '',
    message: '',
    marketingOptIn: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  const set = <K extends keyof ConsultingRequest>(k: K, v: ConsultingRequest[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Errors = {};
    if (!form.name.trim()) err.name = 'Informe um nome (pode ser fictício nesta demonstração).';
    if (!form.company.trim()) err.company = 'Informe o nome da empresa.';
    if (!form.budget) err.budget = 'Selecione uma faixa.';
    if (!form.difficulty) err.difficulty = 'Selecione a principal dificuldade.';
    if (!form.channel) err.channel = 'Escolha um canal de retorno.';
    setErrors(err);
    const first = Object.keys(err)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    const answers = quiz?.completedAt ? quiz.answers : {};
    upsertLocalLead({
      id: quiz?.completedAt ? quiz.sessionId : newId('sim'),
      company: form.company.trim(),
      answers: { ...answers, q2: form.budget, q4: form.difficulty },
      metrics: quiz?.completedAt ? quiz.metrics : undefined,
      plan: 'consultoria',
      consulting: { ...form, name: form.name.trim(), company: form.company.trim() },
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <CheckCircle2 className="mx-auto h-12 w-12 text-ok" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold" role="status">
          Solicitação de demonstração registrada neste navegador.
        </h1>
        <p className="mt-2 text-ink-soft">Nenhuma mensagem foi enviada. Nesta fase não há agenda nem retorno automático.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton to="/admin-demo">Ver no painel de demonstração</LinkButton>
          <LinkButton to="/" variant="secondary">Voltar ao início</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6 sm:pt-12">
      <Link to="/planos" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar aos planos
      </Link>
      <p className="text-xs font-bold uppercase tracking-wider text-brand">Consultoria estratégica</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Solicitar conversa inicial</h1>
      <p className="mt-2 text-ink-soft">
        Conte um pouco sobre a sua operação. A conversa inicial é sem compromisso e sem cobrança; qualquer proposta vem com escopo e preço antes de pagamento.
      </p>

      <div className="mt-5">
        <DemoBanner>
          <strong>Formulário de demonstração.</strong> Os dados ficam apenas neste navegador e nada é enviado. Para testar, use dados fictícios.
        </DemoBanner>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="name" label="Nome" error={errors.name}>
              <input id="f-name" className="input" autoComplete="off" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} aria-describedby="e-name" />
            </Field>
            <Field id="company" label="Empresa" error={errors.company}>
              <input id="f-company" className="input" autoComplete="off" value={form.company} onChange={(e) => set('company', e.target.value)} aria-invalid={!!errors.company} aria-describedby="e-company" />
            </Field>
          </div>
          <Field id="budget" label="Faixa de investimento mensal em anúncios" error={errors.budget}>
            <select id="f-budget" className="input" value={form.budget} onChange={(e) => set('budget', e.target.value)} aria-invalid={!!errors.budget} aria-describedby="e-budget">
              <option value="">Selecione</option>
              {BUDGETS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </Field>
          <Field id="difficulty" label="Principal dificuldade" error={errors.difficulty}>
            <select id="f-difficulty" className="input" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} aria-invalid={!!errors.difficulty} aria-describedby="e-difficulty">
              <option value="">Selecione</option>
              {DIFFICULTIES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </Field>
          <fieldset>
            <legend className="label">Canal de preferência para retorno</legend>
            <div className="flex flex-wrap gap-2" id="f-channel" tabIndex={-1}>
              {CHANNELS.map((c) => (
                <label key={c} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${form.channel === c ? 'border-brand bg-brand-50 text-brand-700' : 'border-line bg-white hover:border-[#B2CCFF]'}`}>
                  <input type="radio" name="channel" value={c} checked={form.channel === c} onChange={() => set('channel', c)} className="sr-only" />
                  {c}
                </label>
              ))}
            </div>
            {errors.channel && <p className="mt-1.5 text-xs font-semibold text-bad-700">{errors.channel}</p>}
          </fieldset>
          <Field id="message" label="Algo mais que queira contar? (opcional)">
            <textarea id="f-message" rows={3} className="input resize-y" value={form.message} onChange={(e) => set('message', e.target.value)} />
          </Field>

          <div className="rounded-xl bg-canvas p-4 text-sm">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={form.marketingOptIn} onChange={(e) => set('marketingOptIn', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line accent-brand" />
              <span>Aceito receber comunicações comerciais da Qvn Ads. (Opcional — você pode cancelar quando quiser.)</span>
            </label>
            <p className="mt-3 text-xs text-ink-mute">
              Usaremos estas informações apenas para avaliar seu caso e responder a esta solicitação.{' '}
              <Link to="/privacidade" className="font-semibold underline">Aviso de privacidade</Link>.
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full sm:w-auto sm:justify-self-start">
            Registrar solicitação (demonstração)
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="label">{label}</label>
      {children}
      {error && <p id={`e-${id}`} className="mt-1.5 text-xs font-semibold text-bad-700">{error}</p>}
    </div>
  );
}
