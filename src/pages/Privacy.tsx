import { useLocation } from 'react-router-dom';
import { Card, DemoBanner } from '../components/ui';
import { clearDemo } from '../lib/storage';
import { useState } from 'react';

export default function Privacy() {
  const { pathname } = useLocation();
  const isTerms = pathname === '/termos';
  const [cleared, setCleared] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{isTerms ? 'Termos de uso' : 'Aviso de privacidade'}</h1>
      <div className="mt-4">
        <DemoBanner>Rascunho para o protótipo. A versão final será publicada antes do lançamento.</DemoBanner>
      </div>

      {isTerms ? (
        <Card className="mt-6 space-y-3 p-6 text-sm text-ink-soft">
          <p>O Relatório do Tráfego é uma ferramenta independente, sem vínculo com Meta ou Google.</p>
          <p>O pré-diagnóstico é gerado a partir das respostas fornecidas e não substitui auditoria técnica das contas de anúncio.</p>
          <p>Não há garantia de aumento de vendas, ROAS ou lucro. Planos pagos têm escopo descrito na página de planos.</p>
        </Card>
      ) : (
        <Card className="mt-6 space-y-4 p-6 text-sm text-ink-soft">
          <section>
            <h2 className="font-bold text-ink">Neste protótipo</h2>
            <p className="mt-1">Respostas, números e formulários ficam salvos apenas no armazenamento local do seu navegador. Nada é enviado a servidores, e não usamos cookies de rastreamento.</p>
          </section>
          <section>
            <h2 className="font-bold text-ink">Na versão final (prevista)</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Finalidade: gerar seu diagnóstico e, se você solicitar, entregar relatórios ou responder a pedidos de contato.</li>
              <li>Coleta mínima: o quiz não pede nome, telefone ou e-mail.</li>
              <li>Comunicações comerciais apenas com seu consentimento, que pode ser retirado a qualquer momento.</li>
              <li>Canal para dúvidas, correção ou exclusão de dados será informado aqui.</li>
            </ul>
          </section>
          <section className="border-t border-line pt-4">
            <h2 className="font-bold text-ink">Limpar dados desta demonstração</h2>
            <p className="mt-1">Remove o progresso do quiz e as simulações salvas neste navegador.</p>
            <button
              type="button"
              onClick={() => {
                clearDemo();
                setCleared(true);
              }}
              className="mt-3 rounded-xl border border-line px-4 py-2 font-semibold text-ink hover:bg-canvas"
            >
              Limpar dados locais
            </button>
            {cleared && <p role="status" className="mt-2 font-semibold text-[#067647]">Dados locais removidos.</p>}
          </section>
        </Card>
      )}
    </div>
  );
}
