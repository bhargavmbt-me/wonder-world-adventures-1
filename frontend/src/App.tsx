import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChildProvider, useChild } from "@/context/ChildContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import OnboardingPage from "./pages/OnboardingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import HomePage from "./pages/HomePage";
import GamesPage from "./pages/GamesPage";
import StoriesPage from "./pages/StoriesPage";
import ChatPage from "./pages/ChatPage";
import ParentsPage from "./pages/ParentsPage";
import LearnPage from "./pages/LearnPage";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

// Admin Pages
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StoriesAdmin from "./pages/admin/StoriesAdmin";
import LanguagesAdmin from "./pages/admin/LanguagesAdmin";
import LessonsAdmin from "./pages/admin/LessonsAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";
import SubscriptionsAdmin from "./pages/admin/SubscriptionsAdmin";
import PaymentsAdmin from "./pages/admin/PaymentsAdmin";
import AnalyticsAdmin from "./pages/admin/AnalyticsAdmin";
import SettingsAdmin from "./pages/admin/SettingsAdmin";
import LessonBuilderPage from "./pages/admin/LessonBuilderPage";
import MediaLibrary from "./pages/admin/MediaLibrary";
import ImportHistory from "./pages/admin/ImportHistory";
import AiModelsAdmin from "./pages/admin/AiModelsAdmin";
import AiPromptsAdmin from "./pages/admin/AiPromptsAdmin";
import LifeSkillsAdmin from "./pages/admin/LifeSkillsAdmin";
import AdsAdmin from "./pages/admin/AdsAdmin";
import LifeSkillsPage from "./pages/LifeSkillsPage";
import LifeSkillsChatPage from "./pages/LifeSkillsChatPage";
import DictionaryPage from "./pages/DictionaryPage";

import { ADMIN_EMAIL } from "./lib/adminApi";
import { apiFetch } from "./lib/api";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh data
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
      refetchOnWindowFocus: false, // Don't refetch on window/tab focus
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnReconnect: "always",
    },
    mutations: {
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const { profile } = useChild();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

// Admin-only route guard — checks email
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (user?.email !== ADMIN_EMAIL) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, user, token } = useAuth();
  const { profile, setPremium } = useChild();

  // Hide BottomNav for admin users
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isAuthenticated && profile && !isAdmin && token) {
      apiFetch<{ status: string }>("/subscriptions/status", {}, token)
        .then((data) => {
          const isPremium = data.status === "ACTIVE";
          if (profile.isPremium !== isPremium) {
            setPremium(isPremium);
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, isAdmin, setPremium]); // check once on auth load

  return (
    <>
      <Routes>
        {/* ── Auth ─────────────────────────────── */}
        <Route path="/login" element={isAuthenticated && !isAdmin ? <Navigate to="/" replace /> : <SignInPage />} />
        <Route path="/signup" element={isAuthenticated && !isAdmin ? <Navigate to="/" replace /> : <SignUpPage />} />
        <Route path="/onboarding" element={!isAuthenticated ? <Navigate to="/login" replace /> : profile ? <Navigate to="/" replace /> : <OnboardingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* ── Child App ─────────────────────────── */}
        <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/games" element={<ProtectedRoute><GamesPage /></ProtectedRoute>} />
        <Route path="/stories" element={<ProtectedRoute><StoriesPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/parents" element={<ProtectedRoute><ParentsPage /></ProtectedRoute>} />
        <Route path="/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
        <Route path="/lessons" element={<Navigate to="/learn" replace />} />
        <Route path="/life-skills" element={<ProtectedRoute><LifeSkillsPage /></ProtectedRoute>} />
        <Route path="/life-skills/:slug/practice" element={<ProtectedRoute><LifeSkillsChatPage /></ProtectedRoute>} />
        <Route path="/dictionary" element={<ProtectedRoute><DictionaryPage /></ProtectedRoute>} />
        <Route path="/subscription" element={<Navigate to="/parents" replace />} />

        {/* ── Admin ─────────────────────────────── */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={isAuthenticated && user?.email === ADMIN_EMAIL ? <Navigate to="/admin/dashboard" replace /> : <AdminLoginPage />} />
        <Route path="/login/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/ai-models" element={<AdminRoute><AiModelsAdmin /></AdminRoute>} />
        <Route path="/admin/ai-prompts" element={<AdminRoute><AiPromptsAdmin /></AdminRoute>} />
        <Route path="/admin/stories" element={<AdminRoute><StoriesAdmin /></AdminRoute>} />
        <Route path="/admin/languages" element={<AdminRoute><LanguagesAdmin /></AdminRoute>} />
        <Route path="/admin/lessons" element={<AdminRoute><LessonsAdmin /></AdminRoute>} />
        <Route path="/admin/lessons/create" element={<AdminRoute><LessonBuilderPage /></AdminRoute>} />
        <Route path="/admin/lessons/:id/edit" element={<AdminRoute><LessonBuilderPage /></AdminRoute>} />
        <Route path="/admin/media" element={<AdminRoute><MediaLibrary /></AdminRoute>} />
        <Route path="/admin/import-history" element={<AdminRoute><ImportHistory /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UsersAdmin /></AdminRoute>} />
        <Route path="/admin/subscriptions" element={<AdminRoute><SubscriptionsAdmin /></AdminRoute>} />
        <Route path="/admin/payments" element={<AdminRoute><PaymentsAdmin /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AnalyticsAdmin /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><SettingsAdmin /></AdminRoute>} />
        <Route path="/admin/ads" element={<AdminRoute><AdsAdmin /></AdminRoute>} />
        <Route path="/admin/life-skills" element={<AdminRoute><LifeSkillsAdmin /></AdminRoute>} />

        {/* ── 404 ──────────────────────────────── */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Hide bottom nav on admin and unauth pages */}
      {isAuthenticated && profile && !isAdmin && <BottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ChildProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ChildProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
