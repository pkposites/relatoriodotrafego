import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { btnClass } from './ui';

function Header() {
  const { pathname } = useLocation();
  const inQuiz = pathname === '/diagnostico';
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" aria-label="Relatório do Tráfego — início" className="rounded-lg">
          <Logo compact={inQuiz} />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          {!inQuiz && (
            <NavLink
              to="/planos"
              className={({ isActive }) =>
                `hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline-block ${isActive ? 'text-brand' : 'text-ink-soft hover:text-ink'}`
              }
            >
              Planos
            </NavLink>
          )}
          {inQuiz ? (
            <span className="chip bg-brand-50 text-brand-700">Diagnóstico online</span>
          ) : (
            <Link to="/diagnostico" className={btnClass('primary', 'md', 'h-10 px-3.5 text-sm')}>
              Começar diagnóstico
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-md">Ferramenta independente. Não afiliada à Meta ou ao Google.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Rodapé">
          <Link to="/planos" className="hover:text-ink">Planos</Link>
          <Link to="/privacidade" className="hover:text-ink">Privacidade</Link>
          <Link to="/termos" className="hover:text-ink">Termos</Link>
          <Link to="/admin-demo" className="hover:text-ink">Painel (demo)</Link>
        </nav>
      </div>
      <p className="border-t border-line px-4 py-3 text-center text-xs text-ink-mute">
        Protótipo de demonstração · Seus dados são usados neste protótipo apenas localmente.
      </p>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
