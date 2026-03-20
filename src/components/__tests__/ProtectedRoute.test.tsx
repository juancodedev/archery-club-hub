import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContextCore";

// useAuth is mocked in setup.ts but we can override per test
const mockUseAuth = vi.mocked(useAuth);

function renderProtectedRoute(requireSuperAdmin = false) {
    return render(
        <MemoryRouter>
            <ProtectedRoute requireSuperAdmin={requireSuperAdmin}>
                <div data-testid="protected-content">Contenido Protegido</div>
            </ProtectedRoute>
        </MemoryRouter>
    );
}

describe("ProtectedRoute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should show loading spinner when loading is true", () => {
        mockUseAuth.mockReturnValue({
            session: null,
            member: null,
            loading: true,
            signOut: vi.fn(),
            systemMode: "produccion",
        } as unknown as ReturnType<typeof mockUseAuth>);

        renderProtectedRoute();
        expect(screen.getByText("Cargando...")).toBeDefined();
    });

    it("should redirect to /login when there is no session", () => {
        mockUseAuth.mockReturnValue({
            session: null,
            member: null,
            loading: false,
            signOut: vi.fn(),
            systemMode: "produccion",
        } as unknown as ReturnType<typeof mockUseAuth>);

        renderProtectedRoute();
        const navigate = screen.getByTestId("navigate");
        expect(navigate.getAttribute("data-to")).toBe("/login");
    });

    it("should render children when super admin", () => {
        mockUseAuth.mockReturnValue({
            session: { user: { id: "super-admin-id" } } as unknown as ReturnType<typeof mockUseAuth>["session"],
            member: { id: "1", is_super_admin: true, roles: ["superadmin"] } as unknown as ReturnType<typeof mockUseAuth>["member"],
            loading: false,
            signOut: vi.fn(),
            systemMode: "produccion",
        } as unknown as ReturnType<typeof mockUseAuth>);

        renderProtectedRoute();
        expect(screen.getByTestId("protected-content")).toBeDefined();
    });

    it("should render children when in pruebas mode", () => {
        mockUseAuth.mockReturnValue({
            session: { user: { id: "member-id" } } as unknown as ReturnType<typeof mockUseAuth>["session"],
            member: { id: "2", is_super_admin: false, roles: ["socio"], status: "activo" } as unknown as ReturnType<typeof mockUseAuth>["member"],
            loading: false,
            signOut: vi.fn(),
            systemMode: "pruebas",
        } as unknown as ReturnType<typeof mockUseAuth>);

        renderProtectedRoute();
        expect(screen.getByTestId("protected-content")).toBeDefined();
    });

    it("should redirect to /dashboard when non-superAdmin accesses superAdmin-only route in pruebas mode", () => {
        mockUseAuth.mockReturnValue({
            session: { user: { id: "member-id" } } as unknown as ReturnType<typeof mockUseAuth>["session"],
            member: { id: "2", is_super_admin: false, roles: ["socio"], status: "activo" } as unknown as ReturnType<typeof mockUseAuth>["member"],
            loading: false,
            signOut: vi.fn(),
            systemMode: "pruebas",
        } as unknown as ReturnType<typeof mockUseAuth>);

        renderProtectedRoute(true); // requireSuperAdmin = true
        const navigate = screen.getByTestId("navigate");
        expect(navigate.getAttribute("data-to")).toBe("/dashboard");
    });

    it("should block access for inactive member in produccion mode", () => {
        mockUseAuth.mockReturnValue({
            session: { user: { id: "member-id" } } as unknown as ReturnType<typeof mockUseAuth>["session"],
            member: {
                id: "3",
                is_super_admin: false,
                roles: ["socio"],
                status: "inactivo",
                club_status: "activo",
                subscription_end_date: null,
            } as unknown as ReturnType<typeof mockUseAuth>["member"],
            loading: false,
            signOut: vi.fn(),
            systemMode: "produccion",
        } as unknown as ReturnType<typeof mockUseAuth>);

        renderProtectedRoute();
        expect(screen.getByText("Membresía Inactiva")).toBeDefined();
    });

    it("should block access for club blocked in produccion mode (regular member)", () => {
        mockUseAuth.mockReturnValue({
            session: { user: { id: "member-id" } } as unknown as ReturnType<typeof mockUseAuth>["session"],
            member: {
                id: "4",
                is_super_admin: false,
                roles: ["socio"],
                status: "activo",
                club_status: "bloqueado",
                subscription_end_date: null,
            } as unknown as ReturnType<typeof mockUseAuth>["member"],
            loading: false,
            signOut: vi.fn(),
            systemMode: "produccion",
        } as unknown as ReturnType<typeof mockUseAuth>);

        renderProtectedRoute();
        expect(screen.getByText("Acceso Bloqueado")).toBeDefined();
    });

    it("should render children for active member in produccion mode", () => {
        mockUseAuth.mockReturnValue({
            session: { user: { id: "member-id" } } as unknown as ReturnType<typeof mockUseAuth>["session"],
            member: {
                id: "5",
                is_super_admin: false,
                roles: ["socio"],
                status: "activo",
                club_status: "activo",
                subscription_end_date: null,
            } as unknown as ReturnType<typeof mockUseAuth>["member"],
            loading: false,
            signOut: vi.fn(),
            systemMode: "produccion",
        } as unknown as ReturnType<typeof mockUseAuth>);

        renderProtectedRoute();
        expect(screen.getByTestId("protected-content")).toBeDefined();
    });
});
