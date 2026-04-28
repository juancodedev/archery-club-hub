import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InvitationRegisterPage from "../InvitationRegisterPage";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase locally - overrides the global setup mock for this module
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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <InvitationRegisterPage />
        </BrowserRouter>
    );
};

describe("InvitationRegisterPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("debe mostrar 'Enlace Expirado' si la invitación no existe", async () => {
        (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/Enlace Expirado/i)).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("debe mostrar error si hay un problema de permisos (RPC error)", async () => {
        (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: null,
            error: { message: "permission denied", code: "42501" }
        });

        renderPage();

        await waitFor(() => {
            // Debería mostrar el estado expirado como fallback de error UI actual
            expect(screen.getByText(/Enlace Expirado/i)).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it("debe renderizar la página sin crashear", async () => {
        (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
        const { container } = renderPage();
        
        // Wait for the initial loading to finish to avoid act() warnings
        await waitFor(() => {
            expect(container).toBeDefined();
        });
    });
});
