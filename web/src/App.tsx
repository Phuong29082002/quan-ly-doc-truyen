import { lazy } from "react";
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
import NotFoundPage from "./pages/NotFoundPage";
import PricingPage from "./pages/PricingPage";
import ProfilePage from "./pages/ProfilePage";
import MockPaymentPage from "./pages/MockPaymentPage";
import BankTransferPage from "./pages/BankTransferPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import ReadingListPage from "./pages/ReadingListPage";
import RankingPage from "./pages/RankingPage";
import FollowingPage from "./pages/FollowingPage";
import NotificationsPage from "./pages/NotificationsPage";
import BadgesPage from "./pages/BadgesPage";

// Trang quản trị tải riêng khi cần, người đọc không phải tải phần này
const AdminGenresPage = lazy(() => import("./pages/admin/AdminGenresPage"));
const AdminStoriesPage = lazy(() => import("./pages/admin/AdminStoriesPage"));
const AdminStoryFormPage = lazy(() => import("./pages/admin/AdminStoryFormPage"));
const AdminChapterFormPage = lazy(() => import("./pages/admin/AdminChapterFormPage"));
const AdminPackagesPage = lazy(() => import("./pages/admin/AdminPackagesPage"));
const AdminTransactionsPage = lazy(() => import("./pages/admin/AdminTransactionsPage"));
const AdminModerationPage = lazy(() => import("./pages/admin/AdminModerationPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminStatsPage = lazy(() => import("./pages/admin/AdminStatsPage"));

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
            <Route path="/huy-hieu" element={<RequireAuth><BadgesPage /></RequireAuth>} />
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
