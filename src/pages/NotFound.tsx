import { LinkButton } from '../components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <p className="tabular text-5xl font-extrabold text-brand">404</p>
      <h1 className="mt-3 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-ink-soft">O endereço pode ter mudado. Que tal começar pelo diagnóstico?</p>
      <div className="mt-6 flex justify-center gap-3">
        <LinkButton to="/">Início</LinkButton>
        <LinkButton to="/diagnostico" variant="secondary">Diagnóstico</LinkButton>
      </div>
    </div>
  );
}
