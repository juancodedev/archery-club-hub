import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TournamentsPage from "../TournamentsPage";
import { useAuth } from "@/contexts/AuthContextCore";

const mockUseAuth = vi.mocked(useAuth);

const mockAdminMember = {
    id: "admin-1",
    full_name: "Admin User",
    club_id: "club-1",
    is_super_admin: false,
    roles: ["administrador"],
    status: "activo",
    club_status: "activo",
} as unknown as ReturnType<typeof mockUseAuth>["member"];

function renderPage(member: ReturnType<typeof mockUseAuth>["member"] = mockAdminMember) {
    mockUseAuth.mockReturnValue({
        member,
        memberships: [{ club_id: "club-1", club_name: "Club Alpha" }] as unknown as ReturnType<typeof mockUseAuth>["memberships"],
        setActiveMembership: vi.fn(),
        isSuperAdminSubdomain: false,
    });

    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <TournamentsPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe("TournamentsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the page title", () => {
        renderPage();
        expect(screen.getByText("Calendario de Torneos")).toBeInTheDocument();
    });

    it("should render calendar navigation buttons", () => {
        renderPage();
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(0);
    });

    it("should show create tournament button for admin users", () => {
        renderPage();
        expect(screen.getByText("Crear Torneo")).toBeInTheDocument();
    });

    it("should render without crashing for regular members", () => {
        const regularMember = { ...mockAdminMember, roles: ["socio"] };
        renderPage(regularMember as unknown as ReturnType<typeof mockUseAuth>["member"]);
        expect(screen.getByText("Calendario de Torneos")).toBeInTheDocument();
    });
});
