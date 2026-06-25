import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UsagePage from './pages/admin/UsagePage';
import UploadPage from './pages/UploadPage';
import GeneratePage from './pages/GeneratePage';
import AnnotatePage from './pages/AnnotatePage';
import GapReportPage from './pages/GapReportPage';

// TODO: Add auth guard for /admin/* routes before production deployment

export default function App() {
  return (
    <div className="min-h-screen bg-bg font-sans">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/admin/usage" element={<UsagePage />} />
          <Route path="/jobs/:id/generate" element={<GeneratePage />} />
          <Route path="/jobs/:id/gap-report" element={<GapReportPage />} />
          <Route path="/jobs/:id/templates/:templateId/annotate" element={<AnnotatePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
