import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import migration from "../../supabase/migrations/20261109130000_revoke_admin_reset_user_password.sql?raw";

const USER_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const CLUB_ID = "aaaaaaaa-0000-4000-8000-000000000001";

// Mirrors the signature and grants left by 20260317120000_security_hardening_followup.sql.
// The body only records the call: these tests are about who is allowed to invoke it.
const FIXTURE = `
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  CREATE TABLE public.password_resets (user_id uuid NOT NULL);

  CREATE FUNCTION public.admin_reset_user_password(
    p_user_id uuid,
    p_club_id uuid,
    p_new_password text DEFAULT NULL
  ) RETURNS text
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    INSERT INTO public.password_resets (user_id) VALUES (p_user_id);
    RETURN 'ok';
  END;
  $$;

  REVOKE EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, uuid, text) FROM anon;
  GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, uuid, text) TO authenticated;
`;

describe("admin_reset_user_password access", () => {
  let db: PGlite;

  const callAs = (role: string) =>
    db.transaction(async (tx) => {
      await tx.exec(`SET LOCAL ROLE ${role}`);
      return tx.query(`SELECT public.admin_reset_user_password('${USER_ID}', '${CLUB_ID}', 'chosen-password')`);
    });

  const resetCount = async () => {
    const { rows } = await db.query("SELECT 1 FROM public.password_resets");
    return rows.length;
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(FIXTURE);
    await db.exec(migration);
  }, 60_000);

  beforeEach(async () => {
    await db.exec("TRUNCATE public.password_resets");
  });

  it("is not callable by logged-in API users", async () => {
    await expect(callAs("authenticated")).rejects.toThrow(/permission denied for function/);
    expect(await resetCount()).toBe(0);
  });

  it("is not callable by anonymous API users", async () => {
    await expect(callAs("anon")).rejects.toThrow(/permission denied for function/);
    expect(await resetCount()).toBe(0);
  });
});
