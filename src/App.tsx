import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterClubPage from "./pages/RegisterClubPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import NewScorePage from "./pages/NewScorePage";
import ScoresPage from "./pages/ScoresPage";
import AdminPage from "./pages/AdminPage";
import DivisionsAdminPage from "./pages/DivisionsAdminPage";
import TournamentTypesAdminPage from "./pages/TournamentTypesAdminPage";
import ReportsPage from "./pages/ReportsPage";
import TrainingSessionsPage from "./pages/TrainingSessionsPage";
import ClubSettingsPage from "./pages/ClubSettingsPage";
import InvitationRegisterPage from "./pages/InvitationRegisterPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import NotFound from "./pages/NotFound";

import AttendanceMarkPage from "./pages/AttendanceMarkPage";
import BillingPage from "./pages/BillingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-club" element={<RegisterClubPage />} />
            <Route path="/join" element={<InvitationRegisterPage />} />
            <Route path="/attendance/:sessionId" element={<AttendanceMarkPage />} />
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
              element={<ProtectedRoute><AppLayout><NewScorePage /></AppLayout></ProtectedRoute>}
            />
            <Route
              path="/scores"
              element={<ProtectedRoute><AppLayout><ScoresPage /></AppLayout></ProtectedRoute>}
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
              path="/super-admin/*"
              element={<ProtectedRoute><AppLayout><SuperAdminPage /></AppLayout></ProtectedRoute>}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
