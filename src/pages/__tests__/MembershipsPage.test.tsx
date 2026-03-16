import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MembershipsPage from "../../pages/MembershipsPage";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";

const mockUseAuth = vi.mocked(useAuth);

const mockMember = {
    id: "member-1",
    full_name: "Club Admin",
    club_id: "club-abc",
    is_super_admin: false,
    roles: ["administrador"],
} as any;

// Mock members returned by supabase
const mockSupabaseMembers = [
    { id: "m1", full_name: "Ana García", enrollment_date: "2024-01-01", billing_day: 5, grace_days: 7, status: "activo" },
    { id: "m2", full_name: "Carlos López", enrollment_date: "2024-02-01", billing_day: 10, grace_days: 7, status: "activo" },
];

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>{children}</MemoryRouter>
            </QueryClientProvider>
        );
    };
}

describe("MembershipsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseAuth.mockReturnValue({
            member: mockMember,
            memberships: [],
            setActiveMembership: vi.fn(),
        } as any);

        // Mock nested supabase calls
        const mockFrom = vi.mocked(supabase.from);
        mockFrom.mockImplementation((table: string) => {
            const chain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                then: vi.fn(),
            };
            if (table === "members") {
                chain.order = vi.fn().mockResolvedValue({ data: mockSupabaseMembers, error: null });
            } else if (table === "financial_entries") {
                chain.gte = vi.fn().mockResolvedValue({ data: [], error: null });
            }
            return chain as any;
        });
    });

    it("should render page title", () => {
        const wrapper = createWrapper();
        render(<MembershipsPage />, { wrapper });
        expect(screen.getByText("Estado de Membresías")).toBeDefined();
    });

    it("should render search input", () => {
        const wrapper = createWrapper();
        render(<MembershipsPage />, { wrapper });
        expect(screen.getByPlaceholderText("Buscar arquero...")).toBeDefined();
    });

    it("should filter members by search term", async () => {
        const wrapper = createWrapper();
        render(<MembershipsPage />, { wrapper });

        await waitFor(() => {
            const searchInput = screen.getByPlaceholderText("Buscar arquero...");
            fireEvent.change(searchInput, { target: { value: "Ana" } });
        });
    });
});
