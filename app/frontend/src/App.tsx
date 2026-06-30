import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import AccountPage from './pages/AccountPage';
import UsagePage from './pages/admin/UsagePage';
import UploadPage from './pages/UploadPage';
import JobsListPage from './pages/JobsListPage';
import GeneratePage from './pages/GeneratePage';
import AnnotatePage from './pages/AnnotatePage';
import GapReportPage from './pages/GapReportPage';
import EditorPage from './pages/EditorPage';
import DocumentsPage from './pages/DocumentsPage';
import FilesPage from './pages/FilesPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected routes — require auth, render inside navbar layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/" element={<JobsListPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/documents" element={<FilesPage />} />
              <Route path="/admin/usage" element={<UsagePage />} />
              <Route path="/jobs/:id/generate" element={<GeneratePage />} />
              <Route path="/jobs/:id/gap-report" element={<GapReportPage />} />
              <Route path="/jobs/:id/templates/:templateId/annotate" element={<AnnotatePage />} />
              <Route path="/jobs/:id/editor" element={<EditorPage />} />
              <Route path="/jobs/:id/documents" element={<DocumentsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
