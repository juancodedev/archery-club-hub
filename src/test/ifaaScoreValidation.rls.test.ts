import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import roundsMigration from "../../supabase/migrations/20260518221000_add_ifaa_rounds.sql?raw";
import migration from "../../supabase/migrations/20261109140000_ifaa_indoor_scoring.sql?raw";

const INDOOR = "dddddddd-0000-4000-8000-000000000001";
const FIELD = "dddddddd-0000-4000-8000-000000000002";
const LEGACY_INDOOR = "dddddddd-0000-4000-8000-000000000003";
const MEMBER = "eeeeeeee-0000-4000-8000-000000000001";

// Mirrors the columns process_ifaa_score reads, and the trigger that
// 20260518224500_ifaa_backend_triggers.sql attaches to public.scores.
const FIXTURE = `
  CREATE TABLE public.tournament_types (id uuid PRIMARY KEY, name text NOT NULL, arrows_per_end integer NOT NULL);
  CREATE TABLE public.divisions (id uuid PRIMARY KEY, name text, abbreviation text);
  CREATE TABLE public.scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid NOT NULL,
    tournament_type_id uuid,
    division_id uuid,
    score_date date NOT NULL DEFAULT current_date,
    ends jsonb,
    total_score integer NOT NULL DEFAULT 0
  );
`;

const TRIGGER = `
  CREATE TRIGGER trigger_process_ifaa_score
    BEFORE INSERT OR UPDATE ON public.scores
    FOR EACH ROW EXECUTE FUNCTION public.process_ifaa_score();
`;

describe("IFAA score validation trigger", () => {
  let db: PGlite;

  const insertScore = (tournamentTypeId: string, ends: string[][]) =>
    db.query("INSERT INTO public.scores (member_id, tournament_type_id, ends) VALUES ($1, $2, $3::jsonb)", [
      MEMBER,
      tournamentTypeId,
      JSON.stringify(ends),
    ]);

  const scoreCount = async () => {
    const { rows } = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM public.scores");
    return rows[0].count;
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(FIXTURE);
    await db.exec(roundsMigration);
    await db.query(
      `INSERT INTO public.tournament_types (id, name, arrows_per_end, ifaa_round) VALUES
        ($1, 'IFAA Indoor Round', 5, 'indoor_standard'),
        ($2, 'IFAA Field Round', 4, 'field'),
        ($3, 'IFAA Indoor Standard Round', 4, 'indoor_standard')`,
      [INDOOR, FIELD, LEGACY_INDOOR],
    );
    await db.exec(migration);
    await db.exec(TRIGGER);
  }, 60_000);

  beforeEach(async () => {
    await db.exec("TRUNCATE public.scores");
  });

  describe("indoor round", () => {
    it("accepts an end of five arrows scored from 5 down to 1, with X and misses", async () => {
      await insertScore(INDOOR, [
        ["X", "5", "4", "3", "2"],
        ["1", "M", "0", "", ""],
      ]);
      expect(await scoreCount()).toBe(1);
    });

    it("rejects an end of four arrows", async () => {
      await expect(insertScore(INDOOR, [["5", "5", "5", "5"]])).rejects.toThrow(
        "En ronda Indoor, el blanco 1 debe tener exactamente 5 flechas.",
      );
      expect(await scoreCount()).toBe(0);
    });

    it("rejects a value outside the indoor face", async () => {
      await expect(insertScore(INDOOR, [["6", "5", "4", "3", "2"]])).rejects.toThrow(
        "Valor de flecha inválido (6 en blanco 1, flecha 1). Valores válidos: X, 5, 4, 3, 2, 1, M.",
      );
      expect(await scoreCount()).toBe(0);
    });
  });

  describe("indoor tournament types", () => {
    const arrowsPerEnd = async (id: string) => {
      const { rows } = await db.query<{ arrows_per_end: number }>(
        "SELECT arrows_per_end FROM public.tournament_types WHERE id = $1",
        [id],
      );
      return rows[0].arrows_per_end;
    };

    it("moves indoor types still set to four arrows per end to five", async () => {
      expect(await arrowsPerEnd(LEGACY_INDOOR)).toBe(5);
      expect(await arrowsPerEnd(INDOOR)).toBe(5);
    });

    it("leaves field types at four arrows per end", async () => {
      expect(await arrowsPerEnd(FIELD)).toBe(4);
    });
  });

  describe("field round keeps its previous rules", () => {
    it("accepts an end of four arrows scored 5, 4, 3 and M", async () => {
      await insertScore(FIELD, [["5", "4", "3", "M"]]);
      expect(await scoreCount()).toBe(1);
    });

    it("rejects an end of five arrows", async () => {
      await expect(insertScore(FIELD, [["5", "4", "3", "M", "5"]])).rejects.toThrow(
        "En ronda Field/Hunter, el blanco 1 debe tener exactamente 4 flechas.",
      );
      expect(await scoreCount()).toBe(0);
    });

    it("rejects 2, 1 and X, which only exist on the indoor face", async () => {
      for (const value of ["2", "1", "X"]) {
        await expect(insertScore(FIELD, [[value, "5", "4", "3"]])).rejects.toThrow(
          `Valor de flecha inválido (${value} en blanco 1, flecha 1). Valores válidos: 5, 4, 3, M.`,
        );
      }
      expect(await scoreCount()).toBe(0);
    });
  });
});
