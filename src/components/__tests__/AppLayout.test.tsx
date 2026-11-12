import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "../AppLayout";
import { useAuth } from "@/contexts/AuthContextCore";

const mockUseAuth = vi.mocked(useAuth);

function renderReadOnlyClub(roles: string[]) {
  mockUseAuth.mockReturnValue({
    member: {
      id: "m1",
      full_name: "Ana Arquera",
      club_id: "club-1",
      is_super_admin: false,
      roles,
      club_status: "bloqueado",
      block_type: "partial",
    },
    signOut: vi.fn(),
    isSuperAdminSubdomain: false,
  } as unknown as ReturnType<typeof mockUseAuth>);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AppLayout>
          <div />
        </AppLayout>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppLayout read-only banner", () => {
  it("offers the billing page to a treasurer", () => {
    renderReadOnlyClub(["tesorero"]);
    expect(screen.getByText("Modo Lectura - Suscripción Vencida")).toBeDefined();
    expect(screen.getByRole("link", { name: "Pagar ahora" }).getAttribute("href")).toBe("/billing");
  });

  it("does not link an archer to the billing page they cannot open", () => {
    renderReadOnlyClub(["arquero"]);
    expect(screen.getByText("Modo Lectura - Suscripción Vencida")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Pagar ahora" })).toBeNull();
  });
});
