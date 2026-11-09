import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import migration from "../../supabase/migrations/20261109120000_protect_member_privileged_columns.sql?raw";

const CLUB_A = "aaaaaaaa-0000-4000-8000-000000000001";
const CLUB_B = "aaaaaaaa-0000-4000-8000-000000000002";

const USER_MEMBER = "bbbbbbbb-0000-4000-8000-000000000001";
const USER_INACTIVE = "bbbbbbbb-0000-4000-8000-000000000002";
const USER_ADMIN = "bbbbbbbb-0000-4000-8000-000000000003";
const USER_SUPER = "bbbbbbbb-0000-4000-8000-000000000004";
const USER_OTHER = "bbbbbbbb-0000-4000-8000-000000000005";

const MEMBER_ID = "cccccccc-0000-4000-8000-000000000001";
const INACTIVE_ID = "cccccccc-0000-4000-8000-000000000002";
const ADMIN_ID = "cccccccc-0000-4000-8000-000000000003";
const SUPER_ID = "cccccccc-0000-4000-8000-000000000004";
const OTHER_IN_A_ID = "cccccccc-0000-4000-8000-000000000005";
const OTHER_IN_B_ID = "cccccccc-0000-4000-8000-000000000006";

// Mirrors the effective auth helpers and members policies from supabase/migrations.
const FIXTURE = `
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT (nullif(current_setting('request.jwt.claims', true), '')::json->>'sub')::uuid $$;

  CREATE TYPE public.club_role AS ENUM ('arquero', 'administrador', 'presidente');
  CREATE TYPE public.member_status AS ENUM ('activo', 'inactivo');
  CREATE TABLE public.members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    club_id uuid,
    full_name text NOT NULL,
    status public.member_status NOT NULL DEFAULT 'activo',
    is_super_admin boolean NOT NULL DEFAULT false,
    grace_days integer
  );
  CREATE TABLE public.member_roles (
    member_id uuid NOT NULL,
    club_id uuid NOT NULL,
    role public.club_role NOT NULL
  );
  GRANT ALL ON public.members, public.member_roles TO anon, authenticated, service_role;

  CREATE FUNCTION public.is_super_admin(p_user_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND is_super_admin = true);
  $$;
  CREATE FUNCTION public.is_club_admin(p_user_id uuid, p_club_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.member_roles mr
      WHERE mr.club_id = p_club_id
        AND mr.role IN ('administrador'::public.club_role, 'presidente'::public.club_role)
        AND mr.member_id IN (SELECT id FROM public.members WHERE user_id = p_user_id)
    ) OR public.is_super_admin(p_user_id);
  $$;

  ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Members read own" ON public.members FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  CREATE POLICY "Admin can manage members" ON public.members FOR ALL TO authenticated
    USING (public.is_club_admin(auth.uid(), club_id))
    WITH CHECK (public.is_club_admin(auth.uid(), club_id));
  CREATE POLICY "Members update own" ON public.members FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  CREATE FUNCTION public.definer_grant_super_admin(p_member_id uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    UPDATE public.members SET is_super_admin = true WHERE id = p_member_id;
  $$;
`;

const SEED = `
  TRUNCATE public.members, public.member_roles;
  INSERT INTO public.members (id, user_id, club_id, full_name, status, is_super_admin, grace_days) VALUES
    ('${MEMBER_ID}', '${USER_MEMBER}', '${CLUB_A}', 'Common Member', 'activo', false, NULL),
    ('${INACTIVE_ID}', '${USER_INACTIVE}', '${CLUB_A}', 'Inactive Member', 'inactivo', false, NULL),
    ('${ADMIN_ID}', '${USER_ADMIN}', '${CLUB_A}', 'Club Admin', 'activo', false, NULL),
    ('${SUPER_ID}', '${USER_SUPER}', NULL, 'Platform Admin', 'activo', true, NULL);
  INSERT INTO public.member_roles (member_id, club_id, role) VALUES
    ('${ADMIN_ID}', '${CLUB_A}', 'administrador');
`;

const DENIED = /No tienes permisos/;

describe("members privileged columns", () => {
  let db: PGlite;

  const runAs = (role: string, userId: string | null, sql: string) =>
    db.transaction(async (tx) => {
      await tx.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role }),
      ]);
      await tx.exec(`SET LOCAL ROLE ${role}`);
      return tx.query(sql);
    });

  const asUser = (userId: string, sql: string) => runAs("authenticated", userId, sql);

  const memberRow = async (id: string) => {
    const { rows } = await db.query<{
      user_id: string | null;
      club_id: string | null;
      status: string;
      is_super_admin: boolean;
      full_name: string;
      grace_days: number | null;
    }>("SELECT * FROM public.members WHERE id = $1", [id]);
    return rows[0];
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(FIXTURE);
    await db.exec(migration);
  }, 60_000);

  beforeEach(async () => {
    await db.exec(SEED);
  });

  describe("rejected changes", () => {
    it("stops a member from granting themselves super admin", async () => {
      await expect(
        asUser(USER_MEMBER, `UPDATE public.members SET is_super_admin = true WHERE id = '${MEMBER_ID}'`),
      ).rejects.toThrow(DENIED);
      expect((await memberRow(MEMBER_ID)).is_super_admin).toBe(false);
    });

    it("stops a member from moving themselves to another club", async () => {
      await expect(
        asUser(USER_MEMBER, `UPDATE public.members SET club_id = '${CLUB_B}' WHERE id = '${MEMBER_ID}'`),
      ).rejects.toThrow(DENIED);
      expect((await memberRow(MEMBER_ID)).club_id).toBe(CLUB_A);
    });

    it("stops an inactive member from reactivating themselves", async () => {
      await expect(
        asUser(USER_INACTIVE, `UPDATE public.members SET status = 'activo' WHERE id = '${INACTIVE_ID}'`),
      ).rejects.toThrow(DENIED);
      expect((await memberRow(INACTIVE_ID)).status).toBe("inactivo");
    });

    it("stops a club admin from granting super admin to a club member", async () => {
      await expect(
        asUser(USER_ADMIN, `UPDATE public.members SET is_super_admin = true WHERE id = '${MEMBER_ID}'`),
      ).rejects.toThrow(DENIED);
      expect((await memberRow(MEMBER_ID)).is_super_admin).toBe(false);
    });

    it("stops a club admin from inserting a super admin member", async () => {
      await expect(
        asUser(
          USER_ADMIN,
          `INSERT INTO public.members (club_id, full_name, is_super_admin) VALUES ('${CLUB_A}', 'Rogue', true)`,
        ),
      ).rejects.toThrow(DENIED);
      const { rows } = await db.query("SELECT 1 FROM public.members WHERE full_name = 'Rogue'");
      expect(rows).toHaveLength(0);
    });

    it("stops a club admin from relinking a member to another account", async () => {
      await expect(
        asUser(USER_ADMIN, `UPDATE public.members SET user_id = '${USER_OTHER}' WHERE id = '${MEMBER_ID}'`),
      ).rejects.toThrow(DENIED);
      expect((await memberRow(MEMBER_ID)).user_id).toBe(USER_MEMBER);
    });

    it("stops a club admin from inserting a member linked to an existing account", async () => {
      await expect(
        asUser(
          USER_ADMIN,
          `INSERT INTO public.members (user_id, club_id, full_name) VALUES ('${USER_SUPER}', '${CLUB_A}', 'Hijacked')`,
        ),
      ).rejects.toThrow(DENIED);
      const { rows } = await db.query("SELECT 1 FROM public.members WHERE full_name = 'Hijacked'");
      expect(rows).toHaveLength(0);
    });

    it("stops an admin of another club from changing their status in this club", async () => {
      await db.exec(`
        INSERT INTO public.members (id, user_id, club_id, full_name) VALUES
          ('${OTHER_IN_A_ID}', '${USER_OTHER}', '${CLUB_A}', 'Plain In A'),
          ('${OTHER_IN_B_ID}', '${USER_OTHER}', '${CLUB_B}', 'Admin In B');
        INSERT INTO public.member_roles (member_id, club_id, role) VALUES
          ('${OTHER_IN_B_ID}', '${CLUB_B}', 'administrador');
      `);
      await expect(
        asUser(USER_OTHER, `UPDATE public.members SET status = 'inactivo' WHERE id = '${OTHER_IN_A_ID}'`),
      ).rejects.toThrow(DENIED);
      expect((await memberRow(OTHER_IN_A_ID)).status).toBe("activo");
    });
  });

  describe("existing behavior that must keep working", () => {
    it("lets a member save their own profile", async () => {
      const result = await asUser(
        USER_MEMBER,
        `UPDATE public.members SET full_name = 'Renamed', grace_days = 7 WHERE id = '${MEMBER_ID}'`,
      );
      expect(result.affectedRows).toBe(1);
      expect(await memberRow(MEMBER_ID)).toMatchObject({ full_name: "Renamed", grace_days: 7 });
    });

    it("lets a club admin change a member's status", async () => {
      const result = await asUser(
        USER_ADMIN,
        `UPDATE public.members SET status = 'inactivo' WHERE id = '${MEMBER_ID}'`,
      );
      expect(result.affectedRows).toBe(1);
      expect((await memberRow(MEMBER_ID)).status).toBe("inactivo");
    });

    it("lets a club admin create a regular member", async () => {
      const result = await asUser(
        USER_ADMIN,
        `INSERT INTO public.members (club_id, full_name) VALUES ('${CLUB_A}', 'New Member')`,
      );
      expect(result.affectedRows).toBe(1);
    });

    it("lets a super admin grant super admin and move a member", async () => {
      await asUser(
        USER_SUPER,
        `UPDATE public.members SET is_super_admin = true, club_id = '${CLUB_B}' WHERE id = '${MEMBER_ID}'`,
      );
      expect(await memberRow(MEMBER_ID)).toMatchObject({ is_super_admin: true, club_id: CLUB_B });
    });

    it("lets the service role used by edge functions change privileged columns", async () => {
      await runAs("service_role", null, `UPDATE public.members SET club_id = '${CLUB_B}' WHERE id = '${MEMBER_ID}'`);
      expect((await memberRow(MEMBER_ID)).club_id).toBe(CLUB_B);
    });

    it("lets SECURITY DEFINER functions change privileged columns", async () => {
      await asUser(USER_MEMBER, `SELECT public.definer_grant_super_admin('${MEMBER_ID}')`);
      expect((await memberRow(MEMBER_ID)).is_super_admin).toBe(true);
    });
  });
});
