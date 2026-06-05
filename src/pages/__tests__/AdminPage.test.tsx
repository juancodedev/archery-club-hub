import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminPage from "../AdminPage";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";

const mockUseAuth = vi.mocked(useAuth);

const mockAdminMember = {
    id: "admin-1",
    full_name: "Juan Admin",
    club_id: "club-1",
    is_super_admin: false,
    roles: ["administrador"],
    status: "activo",
    email: "juan@club.cl",
    user_id: "user-1",
} as unknown as ReturnType<typeof mockUseAuth>["member"];

const mockSuperAdminMember = {
    id: "super-1",
    full_name: "Super User",
    club_id: "club-1",
    is_super_admin: true,
    roles: [],
    status: "activo",
    email: "super@admin.cl",
    user_id: "user-super",
} as unknown as ReturnType<typeof mockUseAuth>["member"];

const mockMembers = [
    {
        id: "m1",
        full_name: "Ana García",
        email: "ana@test.cl",
        status: "activo",
        club_id: "club-1",
        identification: "12.345.678-9",
        enrollment_date: "2024-01-15",
        phone: "+56 9 1234 5678",
        address: "Calle 123",
        member_roles: [{ role: "socio" }],
        financialStatus: "vigente",
        user_id: null,
        date_of_birth: null,
        observations: null,
        medical_history: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        shirt_size: null,
        windbreaker_size: null,
        display_name: null,
        guardian_name: null,
        guardian_phone: null,
        guardian_email: null,
        billing_day: null,
        grace_days: null,
    },
    {
        id: "m2",
        full_name: "Carlos López",
        email: "carlos@test.cl",
        status: "inactivo",
        club_id: "club-1",
        identification: "98.765.432-1",
        enrollment_date: "2024-02-20",
        phone: null,
        address: null,
        member_roles: [{ role: "entrenador" }],
        financialStatus: "vencido",
        user_id: null,
        date_of_birth: null,
        observations: null,
        medical_history: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        shirt_size: null,
        windbreaker_size: null,
        display_name: null,
        guardian_name: null,
        guardian_phone: null,
        guardian_email: null,
        billing_day: null,
        grace_days: null,
    },
];

// Build a thenable mock chain that returns table-specific data
function createMockChain(table: string) {
    const dataMap: Record<string, unknown> = {
        members: mockMembers,
        clubs: [],
        financial_entries: [],
    };

    const data = dataMap[table] ?? [];
    const promise = Promise.resolve({ data, error: null });

    const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        neq: vi.fn(() => chain),
        or: vi.fn(() => chain),
        and: vi.fn(() => chain),
        filter: vi.fn(() => chain),
        ilike: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lt: vi.fn(() => chain),
        gt: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        range: vi.fn(() => chain),
        in: vi.fn(() => chain),
        not: vi.fn(() => chain),
        single: vi.fn(() => promise),
        maybeSingle: vi.fn(() => promise),
        returns: vi.fn(() => chain),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
        throwOnError: vi.fn(() => chain),
    };

    return chain;
}

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>{children}</BrowserRouter>
            </QueryClientProvider>
        );
    };
}

describe("AdminPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default: regular admin (not super admin)
        mockUseAuth.mockReturnValue({
            member: mockAdminMember,
            memberships: [],
            setActiveMembership: vi.fn(),
            isSuperAdminSubdomain: false,
        } as unknown as ReturnType<typeof mockUseAuth>);

        // Each call to supabase.from returns a fresh chain with table-specific data
        vi.mocked(supabase.from).mockImplementation(
            (table: string) => createMockChain(table) as unknown as ReturnType<typeof supabase.from>,
        );
    });

    it("should render the page title and description", () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });
        expect(screen.getByText("Gestión de Miembros")).toBeInTheDocument();
        expect(screen.getByText(/Administra los arqueros/i)).toBeInTheDocument();
    });

    it("should not show club selector for regular admin", () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });
        expect(screen.queryByText("Seleccionar club")).toBeNull();
    });

    it("should show club selector for super admin", () => {
        mockUseAuth.mockReturnValue({
            member: mockSuperAdminMember,
            memberships: [],
            setActiveMembership: vi.fn(),
            isSuperAdminSubdomain: false,
        } as unknown as ReturnType<typeof mockUseAuth>);
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });
        expect(screen.getByText("Seleccionar club")).toBeInTheDocument();
    });

    it("should render search input", async () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });
        expect(await screen.findByPlaceholderText("Buscar por nombre o email...")).toBeInTheDocument();
    });

    it("should show invite member and add member dialog triggers", async () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });
        expect(await screen.findByText("Invitar vía Link")).toBeInTheDocument();
        expect(await screen.findByText("Agregar Miembro")).toBeInTheDocument();
    });

    it("should display member names from supabase data", async () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });

        // Names appear in both desktop and mobile views, so use getAllByText
        await waitFor(() => {
            expect(screen.getAllByText("Ana García").length).toBeGreaterThan(0);
        });
        expect(screen.getAllByText("Ana García").length).toBe(2);
        expect(screen.getAllByText("Carlos López").length).toBe(2);
    });

    it("should show status badges for members", async () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });
        // Status badges appear in both views
        await waitFor(() => {
            expect(screen.getAllByText("activo").length).toBeGreaterThan(0);
        });
        expect(screen.getAllByText("inactivo").length).toBeGreaterThan(0);
    });

    it("should show role badges for members", async () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });
        // Role badges appear in both views
        await waitFor(() => {
            expect(screen.getAllByText("socio").length).toBeGreaterThan(0);
        });
        expect(screen.getAllByText("entrenador").length).toBeGreaterThan(0);
    });

    it("should filter members when typing in search", async () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });

        await waitFor(() => {
            expect(screen.getAllByText("Ana García").length).toBeGreaterThan(0);
        });

        const searchInput = screen.getByPlaceholderText("Buscar por nombre o email...");
        fireEvent.change(searchInput, { target: { value: "Ana" } });

        await waitFor(() => {
            expect(screen.getAllByText("Ana García").length).toBeGreaterThan(0);
            expect(screen.queryAllByText("Carlos López").length).toBe(0);
        });
    });

    it("should show empty state when search has no matches", async () => {
        const wrapper = createWrapper();
        render(<AdminPage />, { wrapper });

        await waitFor(() => {
            expect(screen.getAllByText("Ana García").length).toBeGreaterThan(0);
        });

        const searchInput = screen.getByPlaceholderText("Buscar por nombre o email...");
        fireEvent.change(searchInput, { target: { value: "NonExistentNameXYZ" } });

        await waitFor(() => {
            expect(screen.getByText(/No se encontraron miembros/i)).toBeInTheDocument();
        });
    });
});
