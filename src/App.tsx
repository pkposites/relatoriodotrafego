import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { loadPixel, pixelEvent } from './lib/metaPixel';
import Layout from './components/Layout';
import AdminDemo from './pages/AdminDemo';
import Checkout from './pages/Checkout';
import Consulting from './pages/Consulting';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import Order from './pages/Order';
import Plans from './pages/Plans';
import Privacy from './pages/Privacy';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Sample from './pages/Sample';
import SpecialistPlan from './pages/SpecialistPlan';

const TITLES: Record<string, string> = {
  '/': 'Relatório do Tráfego — Diagnóstico de tráfego pago',
  '/diagnostico': 'Diagnóstico — Relatório do Tráfego',
  '/resultado': 'Seu resultado — Relatório do Tráfego',
  '/planos': 'Plano de Ação do Tráfego — Relatório do Tráfego',
  '/amostra': 'Plano de exemplo — Relatório do Tráfego',
  '/checkout': 'Pedido — Relatório do Tráfego',
  '/diagnostico-especialista': 'Diagnóstico com Especialista — Relatório do Tráfego',
  '/solicitar-consultoria': 'Consultoria — Relatório do Tráfego',
  '/admin-demo': 'Painel (demonstração) — Relatório do Tráfego',
  '/privacidade': 'Privacidade — Relatório do Tráfego',
  '/termos': 'Termos — Relatório do Tráfego',
};

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLES[pathname] ?? (pathname.startsWith('/pedido/') ? 'Seu pedido — Relatório do Tráfego' : 'Relatório do Tráfego');
    loadPixel();
    pixelEvent('PageView');
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
          <Route path="amostra" element={<Sample />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="pedido/:id" element={<Order />} />
          <Route path="diagnostico-especialista" element={<SpecialistPlan />} />
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
