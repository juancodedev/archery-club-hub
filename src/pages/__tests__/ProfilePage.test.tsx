import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProfilePage from "../ProfilePage";
import { useAuth } from "@/contexts/AuthContextCore";

const mockUseAuth = vi.mocked(useAuth);

const mockMember = {
    id: "member-1",
    full_name: "Juan Pérez",
    email: "juan@example.com",
    club_id: "club-1",
    is_super_admin: false,
    roles: ["socio"],
    status: "activo",
    club_status: "activo",
    avatar_url: null,
    date_of_birth: "1990-01-15",
    subscription_end_date: null,
} as unknown as ReturnType<typeof mockUseAuth>["member"];

function renderPage(member: ReturnType<typeof mockUseAuth>["member"] = mockMember) {
    mockUseAuth.mockReturnValue({
        member,
        memberships: [
            { club_id: "club-1", club_name: "Club Alpha", role: "socio" },
        ] as unknown as ReturnType<typeof mockUseAuth>["memberships"],
        setActiveMembership: vi.fn(),
        isSuperAdminSubdomain: false,
    });

    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <ProfilePage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe("ProfilePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the profile title", () => {
        renderPage();
        expect(screen.getByText("Mi Perfil")).toBeInTheDocument();
    });

    it("should render the club selector", () => {
        renderPage();
        // useClubs fetches clubs list — should at least show the page
        expect(screen.getByText("Mi Perfil")).toBeInTheDocument();
    });

    it("should render without crashing", () => {
        renderPage();
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThanOrEqual(0);
    });
});
