import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SuperAdminPage from "../SuperAdminPage";
import { useAuth } from "@/contexts/AuthContextCore";
import React from "react";

// The setup file mocks useLocation to return pathname: "/".
// SuperAdminPage's internal Routes with path="/" renders
// a Navigate to "clubs" (mocked as a testid div). Tab content
// never renders. We test elements OUTSIDE Routes.

const mockUseAuth = vi.mocked(useAuth);

const mockSuperAdminMember = {
    id: "super-1",
    full_name: "Super Admin",
    club_id: "club-1",
    is_super_admin: true,
    roles: [],
    status: "activo",
    email: "super@admin.cl",
} as unknown as ReturnType<typeof mockUseAuth>["member"];

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    {children}
                </MemoryRouter>
            </QueryClientProvider>
        );
    };
}

describe("SuperAdminPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseAuth.mockReturnValue({
            member: mockSuperAdminMember,
            memberships: [],
            setActiveMembership: vi.fn(),
            isSuperAdminSubdomain: false,
        } as unknown as ReturnType<typeof mockUseAuth>);
    });

    it("should render the page title", () => {
        const wrapper = createWrapper();
        render(<SuperAdminPage />, { wrapper });
        expect(screen.getByText("Panel de Control Central")).toBeInTheDocument();
    });

    it("should render the tab navigation items for all management sections", () => {
        const wrapper = createWrapper();
        render(<SuperAdminPage />, { wrapper });

        expect(screen.getByText("Clubes")).toBeInTheDocument();
        expect(screen.getByText("Miembros")).toBeInTheDocument();
        expect(screen.getByText("Finanzas")).toBeInTheDocument();
        expect(screen.getByText("Planes y alumnos")).toBeInTheDocument();
        expect(screen.getByText("Torneos")).toBeInTheDocument();
        expect(screen.getByText("Configuración")).toBeInTheDocument();
        expect(screen.getByText("Reportes")).toBeInTheDocument();
    });

    it("should show super admin description text", () => {
        const wrapper = createWrapper();
        render(<SuperAdminPage />, { wrapper });
        expect(screen.getByText(/Administración global de clientes/i)).toBeInTheDocument();
    });
});
