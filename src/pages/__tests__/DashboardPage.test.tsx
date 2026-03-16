import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "../../pages/DashboardPage";
import { useAuth } from "@/contexts/AuthContextCore";

const mockUseAuth = vi.mocked(useAuth);

const mockMemberAdmin = {
    id: "member-admin-1",
    full_name: "Juan Admin",
    club_id: "club-1",
    is_super_admin: false,
    roles: ["administrador"],
    status: "activo",
    club_status: "activo",
    subscription_end_date: null,
    avatar_url: null,
    date_of_birth: null,
} as any;

const mockMemberRegular = {
    id: "member-regular-1",
    full_name: "Pedro Socio",
    club_id: "club-1",
    is_super_admin: false,
    roles: ["socio"],
    status: "activo",
    club_status: "activo",
    subscription_end_date: null,
    avatar_url: null,
    date_of_birth: null,
} as any;

function renderPage(member: any, memberships: any[] = []) {
    mockUseAuth.mockReturnValue({
        member,
        memberships,
        setActiveMembership: vi.fn(),
        isSuperAdminSubdomain: false,
    } as any);

    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe("DashboardPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render greeting with member's first name", () => {
        renderPage(mockMemberAdmin);
        expect(screen.getByText("Juan", { exact: false })).toBeDefined();
    });

    it("should show admin button for admin member", () => {
        renderPage(mockMemberAdmin);
        expect(screen.getByText("ADMINISTRACIÓN")).toBeDefined();
    });

    it("should not show admin button for regular member", () => {
        renderPage(mockMemberRegular);
        expect(screen.queryByText("ADMINISTRACIÓN")).toBeNull();
    });

    it("should show NUEVO PUNTAJE button for all members", () => {
        renderPage(mockMemberRegular);
        expect(screen.getByText("NUEVO PUNTAJE")).toBeDefined();
    });

    it("should show ENTRENAMIENTOS button for all members", () => {
        renderPage(mockMemberRegular);
        expect(screen.getByText("ENTRENAMIENTOS")).toBeDefined();
    });

    it("should show club switcher when user has multiple memberships", () => {
        renderPage(mockMemberAdmin, [
            { club_id: "club-1", club_name: "Club A" },
            { club_id: "club-2", club_name: "Club B" },
        ]);
        expect(screen.getByText("Cambiar de Club")).toBeDefined();
    });

    it("should NOT show club switcher for single membership", () => {
        renderPage(mockMemberRegular, [{ club_id: "club-1", club_name: "Club Único" }]);
        expect(screen.queryByText("Cambiar de Club")).toBeNull();
    });
});
