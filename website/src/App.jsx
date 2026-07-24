import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import SolutionsPage from './pages/SolutionsPage';
import PilotsPage from './pages/PilotsPage';
import PlatformPage from './pages/PlatformPage';
import InvestorsPage from './pages/InvestorsPage';
import PartnersPage from './pages/PartnersPage';
import ContactPage from './pages/ContactPage';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="solutions" element={<SolutionsPage />} />
          <Route path="pilots" element={<PilotsPage />} />
          <Route path="platform" element={<PlatformPage />} />
          <Route path="investors" element={<InvestorsPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="contact" element={<ContactPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
