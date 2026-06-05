import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BillingPage from "../BillingPage";
import { useAuth } from "@/contexts/AuthContextCore";

const mockUseAuth = vi.mocked(useAuth);

const mockMember = {
    id: "member-1",
    full_name: "Club Admin",
    club_id: "club-1",
    is_super_admin: false,
    roles: ["administrador"],
    status: "activo",
    club_status: "activo",
} as unknown as ReturnType<typeof mockUseAuth>["member"];

function renderPage() {
    mockUseAuth.mockReturnValue({
        member: mockMember,
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
                <BillingPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe("BillingPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the page title", () => {
        renderPage();
        expect(screen.getByText("Planes y alumnos")).toBeInTheDocument();
    });

    it("should render the page description", () => {
        renderPage();
        expect(screen.getByText(/Administra tu plan de suscripción/i)).toBeInTheDocument();
    });

    it("should render the Docs link button", () => {
        renderPage();
        expect(screen.getByText("Docs")).toBeInTheDocument();
    });

    it("should render usage overview section", () => {
        renderPage();
        expect(screen.getByText(/Alumnos registrados/i)).toBeInTheDocument();
    });
});
