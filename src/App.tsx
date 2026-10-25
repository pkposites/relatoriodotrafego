import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Plans from './pages/Plans';
import SpecialistPlan from './pages/SpecialistPlan';
import CheckoutDemo from './pages/CheckoutDemo';
import Consulting from './pages/Consulting';
import AdminDemo from './pages/AdminDemo';
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';

const TITLES: Record<string, string> = {
  '/': 'Relatório do Tráfego — Diagnóstico de anúncios',
  '/diagnostico': 'Diagnóstico — Relatório do Tráfego',
  '/resultado': 'Seu resultado — Relatório do Tráfego',
  '/planos': 'Planos — Relatório do Tráfego',
  '/diagnostico-especialista': 'Diagnóstico com Especialista — Relatório do Tráfego',
  '/checkout-demo': 'Checkout (demonstração) — Relatório do Tráfego',
  '/solicitar-consultoria': 'Solicitar consultoria — Relatório do Tráfego',
  '/admin-demo': 'Painel (demonstração) — Relatório do Tráfego',
  '/privacidade': 'Privacidade — Relatório do Tráfego',
};

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLES[pathname] ?? 'Relatório do Tráfego';
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <RouteEffects />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="diagnostico" element={<Quiz />} />
          <Route path="resultado" element={<Result />} />
          <Route path="planos" element={<Plans />} />
          <Route path="diagnostico-especialista" element={<SpecialistPlan />} />
          <Route path="checkout-demo" element={<CheckoutDemo />} />
          <Route path="solicitar-consultoria" element={<Consulting />} />
          <Route path="admin-demo" element={<AdminDemo />} />
          <Route path="privacidade" element={<Privacy />} />
          <Route path="termos" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
