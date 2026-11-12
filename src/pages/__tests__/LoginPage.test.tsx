import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";
import { useAuth } from "@/contexts/AuthContextCore";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const mockUseAuth = vi.mocked(useAuth);

function renderSignedInWith(search: string) {
  window.history.pushState({}, "", `/login${search}`);
  mockUseAuth.mockReturnValue({
    session: { user: { id: "u1" } },
    member: { id: "m1", is_super_admin: false, roles: ["arquero"], status: "activo", club_status: "activo", subscription_end_date: null },
    isSuperAdminSubdomain: false,
    systemMode: "produccion",
  } as unknown as ReturnType<typeof mockUseAuth>);
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage redirect after sign in", () => {
  beforeEach(() => navigate.mockClear());

  it("follows an in-app redirect", () => {
    renderSignedInWith("?redirect=%2Fattendance%2Fcheckin%3Fclub_id%3Dc1");
    expect(navigate).toHaveBeenCalledWith("/attendance/checkin?club_id=c1");
  });

  it("ignores a redirect to another site and goes to the dashboard", () => {
    renderSignedInWith("?redirect=%2F%5Cevil.example");
    expect(navigate).not.toHaveBeenCalledWith("/\\evil.example");
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });
});
