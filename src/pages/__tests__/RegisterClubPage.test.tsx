import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegisterClubPage from "../RegisterClubPage";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: "1", name: "Basico", price: 29.99 }, error: null }),
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

const renderPage = () => {
    return render(
        <BrowserRouter>
            <RegisterClubPage />
        </BrowserRouter>
    );
};

describe("RegisterClubPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default plans response
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => Promise.resolve({
                data: [{ id: "p1", name: "Basico", price: 29.99 }],
                error: null,
            })),
        }));
    });

    it("debe cargar los planes al iniciar", async () => {
        renderPage();
        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith("plans");
        });
    });

    it("no debe mostrar los campos de montos de inscripción y mensualidad", async () => {
        renderPage();
        await waitFor(() => expect(supabase.from).toHaveBeenCalledWith("plans"));
        expect(screen.queryByText(/Montos de tu Club/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Inscripción/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Mensualidad/i)).not.toBeInTheDocument();
    });

    it("debe registrar un club exitosamente y redirigir al dashboard", async () => {
        const mockAuthData = { user: { id: "user123" } };
        (supabase.auth.signUp as any).mockResolvedValue({ data: mockAuthData, error: null });
        (supabase.rpc as any).mockResolvedValue({ data: "club123", error: null });

        const mockUpdate = vi.fn().mockResolvedValue({ error: null });
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === "plans") {
                return {
                    select: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: [{ id: "p1", name: "Basico", price: 29.99 }], error: null }),
                };
            }
            return {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockImplementation(() => Promise.resolve({ error: null })),
            };
        });

        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/Club de Arquería/i), { target: { value: "Test Club" } });
        fireEvent.change(screen.getByPlaceholderText(/Juan Pérez/i), { target: { value: "Admin Name" } });
        fireEvent.change(screen.getByPlaceholderText(/admin@club.com/i), { target: { value: "test@club.com" } });
        fireEvent.change(screen.getByLabelText(/^Contraseña$/i), { target: { value: "password123" } });

        const submitBtn = screen.getByRole("button", { name: /Registrar Club/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalled();
            expect(supabase.rpc).toHaveBeenCalledWith("register_club", expect.objectContaining({
                p_user_id: "user123",
                p_club_name: "Test Club"
            }));
        });
    });
});
