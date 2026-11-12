import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Index from "../Index";

vi.mock("@/contexts/AuthContextCore", () => ({
  useAuth: () => ({ session: null, member: null }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => Promise.resolve({ data: [], error: null }),
  };
  return { supabase: { from: () => query } };
});

const renderIndex = () =>
  render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>,
  );

describe("landing page", () => {
  it("shows a sample IFAA Field card whose total adds up its ends", () => {
    renderIndex();
    const card = screen.getByText("Ronda IFAA Field").closest("div.rounded-2xl") as HTMLElement;
    // 17 + 13 + 17 + 17 + 19
    expect(within(card).getByText("83")).toBeInTheDocument();
  });

  it("paints the sample arrows like the field face", () => {
    renderIndex();
    const card = screen.getByText("Ronda IFAA Field").closest("div.rounded-2xl") as HTMLElement;
    const cells = within(card).getAllByText("5");
    expect(cells[0]).toHaveClass("bg-ifaa-black");
  });

  it("describes IFAA scoring instead of a fixed 6 ends of 5 arrows", () => {
    renderIndex();
    expect(screen.getByText("Un teclado por ronda")).toBeInTheDocument();
    expect(screen.queryByText(/6 ends y 5 flechas/)).not.toBeInTheDocument();
  });

  it("keeps the sign in and club registration links for visitors", () => {
    renderIndex();
    expect(screen.getByRole("link", { name: "Iniciar Sesión" })).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: /Registrar Club/ })[0]).toHaveAttribute("href", "/register-club");
  });
});
