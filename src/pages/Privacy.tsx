import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, DemoBanner } from '../components/ui';
import { IS_DEMO, SUPPORT_CONTACT } from '../config/env';
import { PIXEL_ID, setConsent } from '../lib/metaPixel';
import { clearAllLocal } from '../lib/storage';

/**
 * Privacidade e termos. O texto descreve o que de fato acontece em cada
 * ambiente. A versão de produção é um rascunho operacional e precisa de
 * revisão final antes do lançamento (pendência "politicas_finais").
 */
export default function Privacy() {
  const { pathname } = useLocation();
  const terms = pathname === '/termos';
  const [cleared, setCleared] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{terms ? 'Termos de uso' : 'Aviso de privacidade'}</h1>
      <div className="mt-4">
        <DemoBanner>
          {IS_DEMO ? 'Esta é a versão de demonstração. O texto abaixo descreve o que acontece nela.' : 'Rascunho operacional — versão final em revisão antes do lançamento.'}
        </DemoBanner>
      </div>

      {terms ? (
        <Card className="mt-6 space-y-3 p-6 text-sm text-ink-soft">
          <p>O Relatório do Tráfego é uma ferramenta independente, sem vínculo com Meta ou Google.</p>
          <p>A avaliação gratuita e o Plano de Ação do Tráfego partem das informações que você fornece. Não acessamos contas de anúncio, site ou criativos, e não se trata de auditoria técnica.</p>
          <p>Não há promessa de aumento de vendas, ROAS, lucro ou economia.</p>
          <p>O plano pago é entregue depois da confirmação do pagamento pela plataforma de pagamento e das informações necessárias. Se a geração falhar, avisamos e o pedido é tratado pelo suporte.</p>
          {IS_DEMO && <p><strong>Na demonstração não há cobrança</strong>: pagamentos e entregas são simulados e rotulados como tal.</p>}
        </Card>
      ) : IS_DEMO ? (
        <Card className="mt-6 space-y-4 p-6 text-sm text-ink-soft">
          <section>
            <h2 className="font-bold text-ink">Nesta demonstração</h2>
            <p className="mt-1">Respostas, números e formulários ficam salvos apenas no armazenamento local do seu navegador. Nada é enviado a servidores ou à IA. Eventos de uso (como “resultado visto”) também ficam só no navegador e não incluem suas respostas.</p>
          </section>
          <PixelSection />
          <ClearLocal cleared={cleared} onClear={() => { clearAllLocal(); setCleared(true); }} />
        </Card>
      ) : (
        <Card className="mt-6 space-y-4 p-6 text-sm text-ink-soft">
          <section>
            <h2 className="font-bold text-ink">O que coletamos e para quê</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Respostas do diagnóstico: para gerar a avaliação gratuita e, se você comprar, o plano. O diagnóstico não pede nome, telefone ou e-mail.</li>
              <li>E-mail na compra: para entrega e suporte. Fica separado das respostas e não é enviado à IA.</li>
              <li>Dados de contato da consultoria: só para responder à solicitação. Comunicações comerciais apenas com seu consentimento, que pode ser retirado a qualquer momento.</li>
              <li>Eventos de uso sem respostas nem dados pessoais (ex.: “diagnóstico concluído”), para melhorar o produto.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-bold text-ink">Onde os dados são tratados</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Servidor e armazenamento da hospedagem do site, para pedidos e arquivos do plano.</li>
              <li>Provedor de IA (OpenAI), apenas com as respostas e números do diagnóstico, sem dados de contato, para redigir o plano.</li>
              <li>Plataforma de pagamento, que processa o pagamento e confirma a compra.</li>
            </ul>
          </section>
          <PixelSection />
          <section>
            <h2 className="font-bold text-ink">Seus direitos</h2>
            <p className="mt-1">Você pode pedir acesso, correção ou exclusão dos seus dados{SUPPORT_CONTACT ? ` pelo contato ${SUPPORT_CONTACT}` : ' pelo canal de suporte informado na compra'}.</p>
          </section>
          <ClearLocal cleared={cleared} onClear={() => { clearAllLocal(); setCleared(true); }} />
        </Card>
      )}
    </div>
  );
}

function PixelSection() {
  if (!PIXEL_ID) return null;
  return (
    <section>
      <h2 className="font-bold text-ink">Pixel da Meta (anúncios)</h2>
      <p className="mt-1">
        Só com a sua autorização, usamos o pixel da Meta e a API de Conversões da Meta para medir nossos anúncios: páginas visitadas e etapas como “diagnóstico concluído”. Junto
        vão o endereço IP, o navegador e os identificadores de cookie da Meta. Não enviamos suas respostas, números, nome, e-mail ou telefone. Na compra, a plataforma de
        pagamento informa a venda à Meta conforme a política dela. Você pode mudar a escolha a qualquer momento.
      </p>
      <button type="button" onClick={() => setConsent(null)} className="mt-3 rounded-xl border border-line px-4 py-2 font-semibold text-ink hover:bg-canvas">
        Rever preferências de cookies
      </button>
    </section>
  );
}

function ClearLocal({ cleared, onClear }: { cleared: boolean; onClear: () => void }) {
  return (
    <section className="border-t border-line pt-4">
      <h2 className="font-bold text-ink">Limpar dados deste navegador</h2>
      <p className="mt-1">Remove o progresso do diagnóstico, pedidos de demonstração e eventos guardados aqui.</p>
      <button type="button" onClick={onClear} className="mt-3 rounded-xl border border-line px-4 py-2 font-semibold text-ink hover:bg-canvas">
        Limpar dados locais
      </button>
      {cleared && <p role="status" className="mt-2 font-semibold text-[#067647]">Dados locais removidos.</p>}
    </section>
  );
}
