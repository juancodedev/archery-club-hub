import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InvitationRegisterPage from "../InvitationRegisterPage";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
        })),
        rpc: vi.fn(),
        auth: {
            signUp: vi.fn(),
        },
    },
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

const renderPage = (token = "test-token") => {
    window.history.pushState({}, "Test page", `/join?token=${token}`);
    return render(
        <BrowserRouter>
            <InvitationRegisterPage />
        </BrowserRouter>
    );
};

describe("InvitationRegisterPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("debe mostrar 'Enlace Expirado' si la invitación no existe", async () => {
        (supabase.rpc as any).mockResolvedValue({ data: [], error: null });

        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/Enlace Expirado/i)).toBeInTheDocument();
        });
    });

    it("debe cargar los datos del club e invitación si el token es válido", async () => {
        const mockInv = [{
            id: "inv1",
            club_id: "club1",
            email: "test@example.com",
            expires_at: new Date(Date.now() + 100000).toISOString(),
            used_at: null
        }];
        const mockClub = { id: "club1", name: "Archer Club", inscription_fee: 1000, monthly_fee: 500 };

        (supabase.rpc as any).mockResolvedValue({ data: mockInv, error: null });
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockClub, error: null }),
        }));

        renderPage();

        await waitFor(() => {
            expect(screen.getAllByText(/Archer Club/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/Inscripción/i).length).toBeGreaterThan(0);
            expect(screen.getByDisplayValue(/test@example.com/i)).toBeInTheDocument();
        });
    });

    it("debe mostrar error si hay un problema de permisos (RPC error)", async () => {
        (supabase.rpc as any).mockResolvedValue({
            data: null,
            error: { message: "permission denied", code: "42501" }
        });

        renderPage();

        await waitFor(() => {
            // Debería mostrar el estado expirado como fallback de error UI actual
            expect(screen.getByText(/Enlace Expirado/i)).toBeInTheDocument();
        });
    });

    it("debe registrar un arquero exitosamente", async () => {
        const mockInv = [{
            id: "inv123",
            club_id: "club456",
            email: "new@archer.com",
            expires_at: new Date(Date.now() + 100000).toISOString(),
            used_at: null
        }];
        const mockClub = { id: "club456", name: "Green Club", inscription_fee: 1000, monthly_fee: 500 };

        (supabase.rpc as any).mockResolvedValue({ data: mockInv, error: null });
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === "clubs") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: mockClub, error: null }),
                };
            }
            if (table === "members") {
                return {
                    insert: vi.fn().mockReturnThis(),
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { id: "member123" }, error: null }),
                };
            }
            return {
                insert: vi.fn().mockResolvedValue({ error: null }),
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            };
        });
        (supabase.auth.signUp as any).mockResolvedValue({ data: { user: { id: "user789" } }, error: null });

        renderPage();

        await waitFor(() => expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Nombre completo/i), { target: { value: "Legolas" } });
        fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), { target: { value: "1990-01-01" } });
        fireEvent.change(screen.getByLabelText(/^Contraseña/i), { target: { value: "secret123" } });

        // Aceptar términos
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);

        const submitBtn = screen.getByRole("button", { name: /Aceptar e Inscribirme/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalled();
            expect(supabase.from).toHaveBeenCalledWith("members");
            expect(supabase.from).toHaveBeenCalledWith("member_invitations");
        });
    });
});
