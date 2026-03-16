import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPasswordPage from "../../pages/ForgotPasswordPage";
import { supabase } from "@/integrations/supabase/client";

const mockAuth = vi.mocked(supabase.auth);

function renderPage() {
    return render(
        <MemoryRouter>
            <ForgotPasswordPage />
        </MemoryRouter>
    );
}

describe("ForgotPasswordPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the forgot password form", () => {
        renderPage();
        expect(screen.getByText("Recuperar contraseña")).toBeDefined();
        expect(screen.getByPlaceholderText("tu@email.com")).toBeDefined();
        expect(screen.getByText("ENVIAR ENLACE")).toBeDefined();
    });

    it("should show success state after sending reset email", async () => {
        mockAuth.resetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null });

        renderPage();

        const input = screen.getByPlaceholderText("tu@email.com");
        fireEvent.change(input, { target: { value: "test@example.com" } });

        const btn = screen.getByText("ENVIAR ENLACE");
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText("Enlace enviado")).toBeDefined();
        });
    });

    it("should show 'Enviando...' while loading", async () => {
        mockAuth.resetPasswordForEmail = vi.fn().mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ data: {}, error: null }), 2000))
        );

        renderPage();

        const input = screen.getByPlaceholderText("tu@email.com");
        fireEvent.change(input, { target: { value: "test@example.com" } });

        const btn = screen.getByText("ENVIAR ENLACE");
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText("Enviando...")).toBeDefined();
        });
    });

    it("should have a back link to /login", () => {
        renderPage();
        const link = screen.getByText("Volver al login");
        expect(link).toBeDefined();
    });
});
