import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditMemberDialog from "../EditMemberDialog";

const update = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => {
        update(payload);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  },
}));

const MEMBER = {
  id: "m1",
  full_name: "Ana Arquera",
  email: null,
  phone: null,
  address: null,
  identification: null,
  date_of_birth: "1990-05-01",
  observations: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  shirt_size: null,
  windbreaker_size: null,
  display_name: null,
  enrollment_date: "2024-03-10",
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <EditMemberDialog member={MEMBER} open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
  // Birth date first, enrollment date second.
  const [, enrollment] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
  return enrollment;
}

describe("EditMemberDialog enrollment date", () => {
  beforeEach(() => update.mockClear());

  it("saves a changed enrollment date", async () => {
    const enrollment = renderDialog();
    fireEvent.change(enrollment, { target: { value: "2025-01-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0]).toMatchObject({ enrollment_date: "2025-01-15" });
  });

  it("does not send null for a cleared enrollment date, which the column rejects", async () => {
    const enrollment = renderDialog();
    fireEvent.change(enrollment, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].enrollment_date).not.toBeNull();
  });
});
