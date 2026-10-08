import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AuthProvider from "./auth/AuthProvider";
import RequireAdmin from "./auth/RequireAdmin";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import StoryDetailPage from "./pages/StoryDetailPage";
import ReadChapterPage from "./pages/ReadChapterPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import AdminGenresPage from "./pages/admin/AdminGenresPage";
import AdminStoriesPage from "./pages/admin/AdminStoriesPage";
import AdminStoryFormPage from "./pages/admin/AdminStoryFormPage";
import AdminChapterFormPage from "./pages/admin/AdminChapterFormPage";
import AdminPackagesPage from "./pages/admin/AdminPackagesPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/truyen/:id" element={<StoryDetailPage />} />
            <Route path="/truyen/:id/chuong/:number" element={<ReadChapterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>}>
              <Route index element={<Navigate to="truyen" replace />} />
              <Route path="the-loai" element={<AdminGenresPage />} />
              <Route path="truyen" element={<AdminStoriesPage />} />
              <Route path="truyen/moi" element={<AdminStoryFormPage />} />
              <Route path="truyen/:id" element={<AdminStoryFormPage />} />
              <Route path="truyen/:id/chuong/moi" element={<AdminChapterFormPage />} />
              <Route path="chuong/:chapterId" element={<AdminChapterFormPage />} />
              <Route path="goi-doc" element={<AdminPackagesPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
