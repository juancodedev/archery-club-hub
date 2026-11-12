import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { useAuth } from "@/contexts/AuthContextCore";

// Render the real route table and ProtectedRoute; stub everything around them.
vi.mock("@/contexts/AuthContext", () => ({ AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const page = (name: string) => ({ default: () => <div data-testid="page">{name}</div> });
vi.mock("@/pages/DashboardPage", () => page("DashboardPage"));
vi.mock("@/pages/ProfilePage", () => page("ProfilePage"));
vi.mock("@/pages/BirthdaysPage", () => page("BirthdaysPage"));
vi.mock("@/pages/AdminPage", () => page("AdminPage"));
vi.mock("@/pages/MembershipsPage", () => page("MembershipsPage"));
vi.mock("@/pages/FinancePage", () => page("FinancePage"));
vi.mock("@/pages/BillingPage", () => page("BillingPage"));
vi.mock("@/pages/ClubSettingsPage", () => page("ClubSettingsPage"));
vi.mock("@/pages/ReportsPage", () => page("ReportsPage"));
vi.mock("@/pages/DivisionsAdminPage", () => page("DivisionsAdminPage"));
vi.mock("@/pages/TournamentTypesAdminPage", () => page("TournamentTypesAdminPage"));
vi.mock("@/pages/TournamentsPage", () => page("TournamentsPage"));

const mockUseAuth = vi.mocked(useAuth);

function visit(path: string, roles: string[]) {
  mockUseAuth.mockReturnValue({
    session: { user: { id: "u1" } },
    member: { id: "m1", club_id: "c1", full_name: "Ana", is_super_admin: false, roles, club_status: "activo" },
    loading: false,
    signOut: vi.fn(),
    systemMode: "produccion",
    memberships: [],
    setActiveMembership: vi.fn(),
    isSuperAdminSubdomain: false,
  } as unknown as ReturnType<typeof mockUseAuth>);
  window.history.pushState({}, "", path);
  render(<App />);
}

// Each admin page is guarded by the same permission that shows it in the AppLayout menu.
// `allowed` has that permission; `denied` is a club role that does not.
const GUARDED = [
  { path: "/admin", page: "AdminPage", allowed: "secretaria", denied: "tesorero" },
  { path: "/admin/memberships", page: "MembershipsPage", allowed: "tesorero", denied: "secretaria" },
  { path: "/admin/finances", page: "FinancePage", allowed: "tesorero", denied: "secretaria" },
  { path: "/billing", page: "BillingPage", allowed: "tesorero", denied: "secretaria" },
  { path: "/settings", page: "ClubSettingsPage", allowed: "presidente", denied: "secretaria" },
  { path: "/reports", page: "ReportsPage", allowed: "presidente", denied: "tesorero" },
  { path: "/admin/divisions", page: "DivisionsAdminPage", allowed: "entrenador", denied: "tesorero" },
  { path: "/admin/tournament-types", page: "TournamentTypesAdminPage", allowed: "entrenador", denied: "tesorero" },
  { path: "/admin/tournaments", page: "TournamentsPage", allowed: "entrenador", denied: "tesorero" },
];

describe("admin route guards", () => {
  afterEach(() => window.history.pushState({}, "", "/"));

  for (const { path, page: name, allowed, denied } of GUARDED) {
    it(`opens ${path} for ${allowed}`, async () => {
      visit(path, [allowed]);
      expect((await screen.findByTestId("page")).textContent).toBe(name);
    });

    it(`redirects ${denied} from ${path} to the dashboard`, async () => {
      visit(path, [denied]);
      expect((await screen.findByTestId("navigate")).getAttribute("data-to")).toBe("/dashboard");
      expect(screen.queryByTestId("page")).toBeNull();
    });
  }

  for (const [path, name] of [["/dashboard", "DashboardPage"], ["/profile", "ProfilePage"], ["/birthdays", "BirthdaysPage"]]) {
    it(`opens ${path} for any club member`, async () => {
      visit(path, ["arquero"]);
      expect((await screen.findByTestId("page")).textContent).toBe(name);
    });
  }
});
