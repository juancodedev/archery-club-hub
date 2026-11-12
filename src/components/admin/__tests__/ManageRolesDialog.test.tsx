import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import ManageRolesDialog from "../ManageRolesDialog";

const insert = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => {
        insert(row);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

describe("ManageRolesDialog", () => {
  it("assigns the tournament manager role", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <ManageRolesDialog memberId="m1" memberName="Ana" clubId="c1" currentRoles={["arquero"]} open onOpenChange={() => {}} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByLabelText("Gestor de torneos"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar roles" }));

    await waitFor(() => expect(insert).toHaveBeenCalledWith({ member_id: "m1", club_id: "c1", role: "gestor_torneos" }));
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
