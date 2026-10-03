import {
  getActiveSkillDescription,
  getSkillDescription,
} from "./activitySkills";

describe("getSkillDescription", () => {
  test("returns trimmed text skills", () => {
    expect(getSkillDescription("  Calculer une addition  ")).toBe("Calculer une addition");
  });

  test.each([
    [{ description: "Ajouter avec retenue" }, "Ajouter avec retenue"],
    [{ description: "", label: "Nombres pairs" }, "Nombres pairs"],
    [{ name: "Lire un nombre" }, "Lire un nombre"],
  ])("reads the first non-empty supported object field", (skill, expected) => {
    expect(getSkillDescription(skill)).toBe(expected);
  });

  test("ignores absent, invalid, and empty skills", () => {
    expect(getSkillDescription(null)).toBe("");
    expect(getSkillDescription(42)).toBe("");
    expect(getSkillDescription({ description: "  ", label: 12 })).toBe("");
    expect(getSkillDescription(["not a skill object"])).toBe("");
  });
});

describe("getActiveSkillDescription", () => {
  test("prefers the active level skill over the activity skill", () => {
    expect(getActiveSkillDescription({
      skill: "Compétence générale",
      levels: {
        level2: { skill: { id: "add", description: "Additionner avec retenue" } },
      },
    }, "level2")).toBe("Additionner avec retenue");
  });

  test("falls back to the activity skill when the active level has no usable skill", () => {
    expect(getActiveSkillDescription({
      skill: { description: "Résoudre des problèmes" },
      levels: { level1: { skill: " " } },
    }, "level1")).toBe("Résoudre des problèmes");
  });

  test("returns an empty string when no skill is configured", () => {
    expect(getActiveSkillDescription({ levels: { level1: {} } }, "level1")).toBe("");
    expect(getActiveSkillDescription(null, "level1")).toBe("");
  });
});
