import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../AuthContext";
import { useAuth } from "../AuthContextCore";

// Use the real context instead of the global useAuth mock from setup.tsx.
vi.mock("@/contexts/AuthContextCore", async (importOriginal) => await importOriginal());

type MembersResult = { data: unknown[] | null; error: { message: string } | null } | "throw";

const state = vi.hoisted(() => ({
  membersResults: [] as MembersResult[],
  authCallback: null as null | ((event: string, session: unknown) => void),
}));

vi.mock("@/integrations/supabase/client", () => {
  const session = { user: { id: "user-1", email: "ana@club.test" } };
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session } }),
        getUser: () => Promise.resolve({ data: { user: session.user } }),
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          state.authCallback = cb;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: () => Promise.resolve({}),
      },
      from: (table: string) => {
        if (table === "system_settings") {
          return { select: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) };
        }
        return {
          select: () => ({
            eq: () => {
              const next = state.membersResults.shift() ?? { data: [], error: null };
              return next === "throw" ? Promise.reject(new Error("fetch failed")) : Promise.resolve(next);
            },
          }),
        };
      },
    },
  };
});

const MEMBER_ROW = {
  id: "member-1",
  user_id: "user-1",
  club_id: "club-1",
  full_name: "Ana Arquera",
  email: "ana@club.test",
  status: "activo",
  is_super_admin: false,
  avatar_url: null,
  clubs: { name: "Club Uno", subscription_status: "activo", subscription_end_date: null, block_type: null },
  member_roles: [{ role: "arquero" }],
};

function Probe() {
  const { member, memberships, loading } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <p data-testid="member">
      {member ? `${member.full_name} (${memberships.length})` : "no member"}
    </p>
  );
}

const ok = (rows: unknown[]): MembersResult => ({ data: rows, error: null });
const failed: MembersResult = { data: null, error: { message: "network error" } };

describe("AuthProvider member loading", () => {
  beforeEach(() => {
    state.membersResults = [];
    state.authCallback = null;
    localStorage.clear();
  });

  it("loads the member of the signed-in user", async () => {
    state.membersResults = [ok([MEMBER_ROW])];
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("member").textContent).toBe("Ana Arquera (1)"));
  });

  it("keeps the loaded member when a later refresh of the members query fails", async () => {
    state.membersResults = [ok([MEMBER_ROW]), failed];
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("member").textContent).toBe("Ana Arquera (1)"));

    await act(async () => {
      state.authCallback?.("TOKEN_REFRESHED", { user: { id: "user-1", email: "ana@club.test" } });
    });

    expect(state.membersResults).toHaveLength(0);
    expect(screen.getByTestId("member").textContent).toBe("Ana Arquera (1)");
  });

  it("still clears the member when the user really has no memberships", async () => {
    state.membersResults = [ok([MEMBER_ROW]), ok([])];
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("member").textContent).toBe("Ana Arquera (1)"));

    await act(async () => {
      state.authCallback?.("USER_UPDATED", { user: { id: "user-1", email: "ana@club.test" } });
    });

    expect(screen.getByTestId("member").textContent).toBe("no member");
  });

  it("keeps the loaded member when a later refresh throws", async () => {
    state.membersResults = [ok([MEMBER_ROW]), "throw"];
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("member").textContent).toBe("Ana Arquera (1)"));

    await act(async () => {
      state.authCallback?.("TOKEN_REFRESHED", { user: { id: "user-1", email: "ana@club.test" } });
    });

    expect(state.membersResults).toHaveLength(0);
    expect(screen.getByTestId("member").textContent).toBe("Ana Arquera (1)");
  });

  it("does not keep another user's member when the query fails after an account switch", async () => {
    state.membersResults = [ok([MEMBER_ROW]), failed];
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("member").textContent).toBe("Ana Arquera (1)"));

    await act(async () => {
      state.authCallback?.("SIGNED_IN", { user: { id: "user-2", email: "bruno@club.test" } });
    });

    expect(state.membersResults).toHaveLength(0);
    expect(screen.getByTestId("member").textContent).toBe("no member");
  });

  it("finishes loading without a member when the first query fails", async () => {
    state.membersResults = [failed];
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("member").textContent).toBe("no member"));
  });
});
