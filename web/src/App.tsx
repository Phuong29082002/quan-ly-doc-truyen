import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AuthProvider from "./auth/AuthProvider";
import RequireAdmin from "./auth/RequireAdmin";
import RequireAuth from "./auth/RequireAuth";
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
import PricingPage from "./pages/PricingPage";
import ProfilePage from "./pages/ProfilePage";
import MockPaymentPage from "./pages/MockPaymentPage";
import BankTransferPage from "./pages/BankTransferPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import ReadingListPage from "./pages/ReadingListPage";
import AdminTransactionsPage from "./pages/admin/AdminTransactionsPage";
import AdminModerationPage from "./pages/admin/AdminModerationPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminStatsPage from "./pages/admin/AdminStatsPage";
import RankingPage from "./pages/RankingPage";
import FollowingPage from "./pages/FollowingPage";
import NotificationsPage from "./pages/NotificationsPage";

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
            <Route path="/goi-doc" element={<PricingPage />} />
            <Route path="/tai-khoan" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/dang-doc" element={<RequireAuth><ReadingListPage /></RequireAuth>} />
            <Route path="/xep-hang" element={<RankingPage />} />
            <Route path="/theo-doi" element={<RequireAuth><FollowingPage /></RequireAuth>} />
            <Route path="/thong-bao" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
            <Route path="/thanh-toan/gia-lap/:id" element={<RequireAuth><MockPaymentPage /></RequireAuth>} />
            <Route path="/thanh-toan/chuyen-khoan/:id" element={<RequireAuth><BankTransferPage /></RequireAuth>} />
            <Route path="/thanh-toan/ket-qua/:id" element={<RequireAuth><PaymentResultPage /></RequireAuth>} />

            <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>}>
              <Route index element={<Navigate to="truyen" replace />} />
              <Route path="the-loai" element={<AdminGenresPage />} />
              <Route path="truyen" element={<AdminStoriesPage />} />
              <Route path="truyen/moi" element={<AdminStoryFormPage />} />
              <Route path="truyen/:id" element={<AdminStoryFormPage />} />
              <Route path="truyen/:id/chuong/moi" element={<AdminChapterFormPage />} />
              <Route path="chuong/:chapterId" element={<AdminChapterFormPage />} />
              <Route path="goi-doc" element={<AdminPackagesPage />} />
              <Route path="giao-dich" element={<AdminTransactionsPage />} />
              <Route path="kiem-duyet" element={<AdminModerationPage />} />
              <Route path="thanh-vien" element={<AdminUsersPage />} />
              <Route path="thong-ke" element={<AdminStatsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
