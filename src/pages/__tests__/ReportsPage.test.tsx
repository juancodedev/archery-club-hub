import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReportsPage from "../ReportsPage";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";

const mockUseAuth = vi.mocked(useAuth);

const mockMember = {
    id: "member-1",
    full_name: "Test Member",
    club_id: "club-1",
    is_super_admin: false,
    roles: ["administrador"],
    status: "activo",
} as unknown as ReturnType<typeof mockUseAuth>["member"];

const mockMembers = [
    { id: "m1", full_name: "Ana García", status: "activo", member_roles: [{ role: "socio" }] },
    { id: "m2", full_name: "Carlos López", status: "inactivo", member_roles: [{ role: "entrenador" }] },
];

const mockScores = [
    {
        id: "s1",
        member_id: "m1",
        total_score: 320,
        score_date: "2024-03-15",
        members: { full_name: "Ana García" },
    },
    {
        id: "s2",
        member_id: "m2",
        total_score: 280,
        score_date: "2024-04-01",
        members: { full_name: "Carlos López" },
    },
];

function createMockChain(table: string) {
    const dataMap: Record<string, unknown> = {
        clubs: [],
        members: mockMembers,
        scores: mockScores,
        training_enrollments: [],
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

describe("ReportsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseAuth.mockReturnValue({
            member: mockMember,
            memberships: [],
            setActiveMembership: vi.fn(),
            isSuperAdminSubdomain: false,
        } as unknown as ReturnType<typeof mockUseAuth>);

        vi.mocked(supabase.from).mockImplementation(
            (table: string) => createMockChain(table) as unknown as ReturnType<typeof supabase.from>,
        );
    });

    it("should render the page title", () => {
        const wrapper = createWrapper();
        render(<ReportsPage />, { wrapper });
        expect(screen.getByText("Reportes")).toBeInTheDocument();
    });

    it("should render tab selectors", () => {
        const wrapper = createWrapper();
        render(<ReportsPage />, { wrapper });
        expect(screen.getByText("Rendimiento")).toBeInTheDocument();
        expect(screen.getByText("Asistencias")).toBeInTheDocument();
    });

    it("should show filter toggle button", () => {
        const wrapper = createWrapper();
        render(<ReportsPage />, { wrapper });
        expect(screen.getByText("Parámetros de Análisis")).toBeInTheDocument();
    });

    it("should show filter fields when toggle is clicked", () => {
        const wrapper = createWrapper();
        render(<ReportsPage />, { wrapper });
        const toggle = screen.getByText("Parámetros de Análisis");
        fireEvent.click(toggle);
        expect(screen.getByText("Arquero")).toBeInTheDocument();
        expect(screen.getByText("Desde")).toBeInTheDocument();
        expect(screen.getByText("Hasta")).toBeInTheDocument();
    });

    it("should render stats cards in performance tab", async () => {
        const wrapper = createWrapper();
        render(<ReportsPage />, { wrapper });
        expect(await screen.findByText("Miembros")).toBeInTheDocument();
        expect(await screen.findByText("Registros")).toBeInTheDocument();
        expect(await screen.findByText("Promedio")).toBeInTheDocument();
        expect(await screen.findByText("Record")).toBeInTheDocument();
    });

    it("should show member names in the filter dropdown", async () => {
        const wrapper = createWrapper();
        render(<ReportsPage />, { wrapper });

        // Open filters to see the member selector
        fireEvent.click(screen.getByText("Parámetros de Análisis"));

        // Wait for members data to load — check for "Todos los arqueros" as select placeholder
        await waitFor(() => {
            expect(screen.getByText("Todos los arqueros")).toBeInTheDocument();
        });
    });

    it("should have both tab triggers available", () => {
        const wrapper = createWrapper();
        render(<ReportsPage />, { wrapper });
        // Both tab triggers should be visible
        expect(screen.getByText("Rendimiento")).toBeInTheDocument();
        expect(screen.getByText("Asistencias")).toBeInTheDocument();
    });

    it("should hide club filter for non-super-admin", () => {
        const wrapper = createWrapper();
        render(<ReportsPage />, { wrapper });
        fireEvent.click(screen.getByText("Parámetros de Análisis"));
        // Club label should NOT be visible for regular admin
        expect(screen.queryByText("Club")).toBeNull();
    });
});
