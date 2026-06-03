import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

// Public routes — always loaded
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterClubPage from "./pages/RegisterClubPage";
import InvitationRegisterPage from "./pages/InvitationRegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded protected routes — split by access level
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NewScorePage = lazy(() => import("./pages/NewScorePage"));
const ScoresPage = lazy(() => import("./pages/ScoresPage"));
const TrainingSessionsPage = lazy(() => import("./pages/TrainingSessionsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const DivisionsAdminPage = lazy(() => import("./pages/DivisionsAdminPage"));
const TournamentTypesAdminPage = lazy(() => import("./pages/TournamentTypesAdminPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ClubSettingsPage = lazy(() => import("./pages/ClubSettingsPage"));
const SuperAdminPage = lazy(() => import("./pages/SuperAdminPage"));
const TournamentsPage = lazy(() => import("./pages/TournamentsPage"));
const AttendanceCheckinPage = lazy(() => import("./pages/AttendanceCheckinPage"));
const AttendanceMarkPage = lazy(() => import("./pages/AttendanceMarkPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const FinancePage = lazy(() => import("./pages/FinancePage"));
const MembershipsPage = lazy(() => import("./pages/MembershipsPage"));
const BirthdaysPage = lazy(() => import("./pages/BirthdaysPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-club" element={<RegisterClubPage />} />
            <Route path="/join" element={<InvitationRegisterPage />} />
            <Route path="/attendance/checkin" element={<AttendanceCheckinPage />} />
            <Route path="/attendance/:sessionId" element={<AttendanceMarkPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/dashboard"
              element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/profile"
              element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/scores/new"
              element={<ProtectedRoute requireArquero><AppLayout><NewScorePage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/scores"
              element={<ProtectedRoute requireArquero><AppLayout><ScoresPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/training"
              element={<ProtectedRoute><AppLayout><TrainingSessionsPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/admin"
              element={<ProtectedRoute><AppLayout><AdminPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/reports"
              element={<ProtectedRoute><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/admin/divisions"
              element={<ProtectedRoute><AppLayout><DivisionsAdminPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/admin/tournament-types"
              element={<ProtectedRoute><AppLayout><TournamentTypesAdminPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute><AppLayout><ClubSettingsPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/billing"
              element={<ProtectedRoute><AppLayout><BillingPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/admin/finances"
              element={<ProtectedRoute><AppLayout><FinancePage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/admin/memberships"
              element={<ProtectedRoute><AppLayout><MembershipsPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/admin/tournaments"
              element={<ProtectedRoute><AppLayout><TournamentsPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/birthdays"
              element={<ProtectedRoute><AppLayout><BirthdaysPage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/super-admin/*"
              element={<ProtectedRoute requireSuperAdmin><AppLayout><SuperAdminPage /></AppLayout></ProtectedRoute>}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
