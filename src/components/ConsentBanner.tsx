import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, onConsentChange, PIXEL_ID, setConsent, type Consent } from '../lib/metaPixel';
import { Button } from './ui';

/** Pede consentimento antes de carregar o pixel da Meta. Sem ID configurado, não aparece. */
export function ConsentBanner() {
  const [consent, setLocal] = useState<Consent>(() => getConsent());
  useEffect(() => onConsentChange(setLocal), []);
  if (!PIXEL_ID || consent) return null;
  return (
    <div role="region" aria-label="Cookies" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-ink-soft">
          Usamos o pixel da Meta para medir nossos anúncios. Ele não recebe suas respostas nem seus dados de contato.{' '}
          <Link to="/privacidade" className="font-semibold text-brand hover:underline">Saiba mais</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" className="h-10 px-4 text-sm" onClick={() => setConsent('denied')}>
            Recusar
          </Button>
          <Button className="h-10 px-4 text-sm" onClick={() => setConsent('granted')}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Link do rodapé para rever a escolha. */
export function ConsentReset() {
  if (!PIXEL_ID) return null;
  return (
    <button type="button" className="hover:text-ink" onClick={() => setConsent(null)}>
      Preferências de cookies
    </button>
  );
}
