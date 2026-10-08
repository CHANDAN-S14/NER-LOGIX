import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppDataProvider } from './context/AppDataContext';
import Dashboard from './pages/Dashboard';

/**
 * NER-LOGIX AI — frontend shell.
 * Dashboard opens directly with no sign-in / JWT gate.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report" element={<Dashboard />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </AppDataProvider>
    </BrowserRouter>
  );
}
