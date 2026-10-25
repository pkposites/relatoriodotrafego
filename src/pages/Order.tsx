import { AlertTriangle, CheckCircle2, Download, FlaskConical, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Deepening } from '../components/Deepening';
import { PlanView } from '../components/PlanView';
import { Button, Card, LinkButton } from '../components/ui';
import { SUPPORT_CONTACT } from '../config/env';
import type { Answers, MetricsInput } from '../domain/types';
import { track } from '../lib/analytics';
import { api } from '../lib/api';
import { buildAll, businessLabel, pdfMeta } from '../lib/planBuilder';
import { getOrder, saveOrder, type LocalOrder } from '../lib/storage';
import { buildPlanDocument } from '../pdf/planDocument';
import { downloadPdf } from '../pdf/renderBrowser';

const STATUS_TEXT: Record<LocalOrder['status'], string> = {
  aguardando_pagamento: 'Aguardando confirmação do pagamento',
  aguardando_informacoes: 'Pagamento confirmado — falta escolher como gerar',
  gerando: 'Gerando e conferindo seu plano',
  concluido: 'Plano pronto',
  falha: 'Não foi possível gerar o plano',
};

export default function Order() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<LocalOrder | undefined>(() => getOrder(id));
  const [serverMsg, setServerMsg] = useState<string>();
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const update = (patch: Partial<LocalOrder>) =>
    setOrder((o) => {
      if (!o) return o;
      const n = { ...o, ...patch };
      saveOrder(n);
      return n;
    });

  // Produção: o estado vem do servidor (único lugar que confirma pagamento).
  useEffect(() => {
    if (!order || order.environment === 'demo' || !order.accessToken) return;
    let stop = false;
    const poll = async () => {
      try {
        const s = await api.status(order.id, order.accessToken!);
        if (stop) return;
        update({ status: s.status as LocalOrder['status'] });
        setServerMsg(s.message);
        if (s.downloadUrl) setDownloadUrl(s.downloadUrl);
        if (!['concluido', 'falha'].includes(s.status)) window.setTimeout(poll, 5000);
      } catch {
        if (!stop) window.setTimeout(poll, 10000);
      }
    };
    poll();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const built = useMemo(() => {
    if (!order || order.status !== 'concluido' || order.environment !== 'demo') return null;
    const answers: Answers = { ...order.answers, ...(order.deepening ?? {}) };
    return { answers, ...buildAll({ id: order.diagnosticId, environment: 'demo', answers, metrics: order.metrics, links: order.links, hasDeepening: !!order.deepening && Object.keys(order.deepening).length > 0, createdAt: order.createdAt }) };
  }, [order]);

  useEffect(() => {
    if (built) track('geracao_concluida', { mode: 'deterministico' });
  }, [built]);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Pedido não encontrado neste navegador</h1>
        <p className="mt-2 text-ink-soft">Use o link de acesso enviado no e-mail da compra.{SUPPORT_CONTACT ? ` Suporte: ${SUPPORT_CONTACT}.` : ''}</p>
        <LinkButton to="/" className="mt-6">Voltar ao início</LinkButton>
      </div>
    );
  }

  const submitDeepening = async (deepening: Answers, metrics?: MetricsInput) => {
    track('aprofundamento_concluido', { mode: Object.keys(deepening).length || metrics ? 'com_contexto' : 'sem_contexto' });
    if (order.environment === 'demo') {
      update({ deepening, metrics, status: 'gerando' });
      // Demonstração: geração determinística local, sem IA. Pequena pausa só para a transição de estado.
      window.setTimeout(() => update({ status: 'concluido' }), 600);
      return;
    }
    try {
      await api.deepening(order.id, order.accessToken!, deepening, metrics);
      update({ status: 'gerando' });
    } catch (e) {
      setServerMsg(e instanceof Error ? e.message : 'Erro ao enviar as informações.');
    }
  };

  const isSpecialist = order.product === 'especialista';

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-12">
      {order.environment === 'demo' && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-dashed border-warn bg-warn-50 p-4 text-sm text-warn-700" role="note">
          <FlaskConical className="h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>Demonstração.</strong> Nenhum pagamento foi feito e nada foi enviado. O plano desta tela é gerado no seu navegador pelas regras do sistema, <strong>sem IA</strong>.
          </p>
        </div>
      )}
      <p className="text-xs font-bold uppercase tracking-wider text-brand">Pedido {order.id}</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{isSpecialist ? 'Diagnóstico com Especialista' : 'Plano de Ação do Tráfego'}</h1>
      <p className="mt-2 flex items-center gap-2 font-semibold" role="status">
        {order.status === 'gerando' && <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />}
        {order.status === 'concluido' && <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />}
        {order.status === 'falha' && <AlertTriangle className="h-4 w-4 text-bad" aria-hidden />}
        {STATUS_TEXT[order.status]}
      </p>
      {serverMsg && <p className="mt-1 text-sm text-ink-soft">{serverMsg}</p>}

      <div className="mt-6 space-y-6">
        {order.status === 'aguardando_pagamento' && (
          <Card className="p-6">
            <p className="text-ink-soft">
              {order.environment === 'demo'
                ? 'Na versão real, esta tela espera a confirmação enviada pela plataforma de pagamento.'
                : 'Assim que a plataforma de pagamento confirmar, esta página atualiza sozinha. Isso costuma levar alguns instantes; pagamentos por boleto podem demorar mais.'}
            </p>
            {order.environment === 'demo' && (
              <Button
                className="mt-4"
                onClick={() => {
                  track('pagamento_confirmado', { plan: order.product, source: 'demo' });
                  update({ status: 'aguardando_informacoes' });
                }}
              >
                Simular confirmação de pagamento (demonstração)
              </Button>
            )}
          </Card>
        )}

        {order.status === 'aguardando_informacoes' &&
          (isSpecialist ? (
            <Card className="p-6">
              <p>Na versão real, o próximo passo é o contato de Robson pelo WhatsApp para combinar o envio dos materiais. Nesta demonstração, nenhuma mensagem é enviada.</p>
            </Card>
          ) : (
            <Deepening answers={order.answers} onSubmit={submitDeepening} />
          ))}

        {order.status === 'gerando' && (
          <Card className="p-6 text-ink-soft">Estamos montando e conferindo o plano. Esta página atualiza sozinha; você pode fechar e voltar pelo link de acesso.</Card>
        )}

        {order.status === 'falha' && (
          <Card className="border-bad p-6">
            <p className="font-bold">Não conseguimos gerar seu plano com a qualidade exigida.</p>
            <p className="mt-1 text-ink-soft">Seu pedido continua registrado e será tratado pela equipe. Nenhuma cobrança adicional será feita.{SUPPORT_CONTACT ? ` Suporte: ${SUPPORT_CONTACT}.` : ''}</p>
          </Card>
        )}

        {order.status === 'concluido' && (built || downloadUrl) && (
          <>
            <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Seu plano está pronto.</p>
                <p className="text-sm text-ink-soft">{built ? 'PDF gerado agora no seu navegador (demonstração).' : 'O link de download é pessoal e expira.'}</p>
              </div>
              {built ? (
                <Button
                  onClick={async () => {
                    track('download', { mode: 'demo' });
                    await downloadPdf(
                      buildPlanDocument(built.plan, pdfMeta(built.d, built.answers, { sampleLabel: 'DEMONSTRAÇÃO — sem pagamento e sem IA', support: SUPPORT_CONTACT })),
                      `plano-de-acao-${businessLabel(built.answers).slice(0, 30).replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.pdf`,
                    );
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden /> Baixar PDF
                </Button>
              ) : (
                <a className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 font-semibold text-white" href={downloadUrl} onClick={() => track('download', { mode: 'producao' })}>
                  <Download className="h-4 w-4" aria-hidden /> Baixar PDF
                </a>
              )}
            </Card>
            {built && <PlanView plan={built.plan} />}
            <Feedback order={order} onSave={(feedback) => update({ feedback })} />
            <p className="text-sm text-ink-soft">
              Quer uma leitura humana do seu caso?{' '}
              <Link className="font-semibold text-brand hover:underline" to="/diagnostico-especialista" onClick={() => track('interesse_especialista', { source: 'pedido' })}>
                Conheça o Diagnóstico com Especialista
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const SCALE5 = [
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '4', label: '4' },
  { id: '5', label: '5' },
];

function Feedback({ order, onSave }: { order: LocalOrder; onSave: (f: LocalOrder['feedback']) => void }) {
  const [clarity, setClarity] = useState(order.feedback?.clarity);
  const [specificity, setSpecificity] = useState(order.feedback?.specificity);
  const [sent, setSent] = useState(!!order.feedback?.clarity);
  if (sent) return <p className="text-sm text-[#067647]">Obrigado pela avaliação.</p>;
  return (
    <Card className="p-5">
      <p className="font-bold">Sua opinião sobre o plano</p>
      <fieldset className="mt-3">
        <legend className="label">Você sabe qual ação executar primeiro?</legend>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {[{ id: 'sim', label: 'Sim' }, { id: 'mais_ou_menos', label: 'Mais ou menos' }, { id: 'nao', label: 'Não' }].map((o) => (
            <label key={o.id} className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold focus-within:ring-2 focus-within:ring-brand ${clarity === o.id ? 'border-brand bg-brand-50 text-brand-700' : 'border-line'}`}>
              <input type="radio" name="clarity" className="sr-only" checked={clarity === o.id} onChange={() => setClarity(o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="label">O quanto este plano foi específico para o seu negócio? (1 = genérico, 5 = muito específico)</legend>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {SCALE5.map((o) => (
            <label key={o.id} className={`tabular cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold focus-within:ring-2 focus-within:ring-brand ${specificity === o.id ? 'border-brand bg-brand-50 text-brand-700' : 'border-line'}`}>
              <input type="radio" name="specificity" className="sr-only" checked={specificity === o.id} onChange={() => setSpecificity(o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        className="mt-4"
        disabled={!clarity || !specificity}
        onClick={() => {
          track('avaliacao_utilidade', { clarity: clarity!, specificity: Number(specificity) });
          onSave({ clarity, specificity });
          setSent(true);
        }}
      >
        Enviar avaliação
      </Button>
    </Card>
  );
}
