export function getSkillDescription(skill) {
  if (typeof skill === "string") {
    return skill.trim();
  }

  if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
    return "";
  }

  for (const value of [skill.description, skill.label, skill.name]) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function getActiveSkillDescription(content, currentLevel) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "";
  }

  const levelSkill = currentLevel
    ? getSkillDescription(content.levels?.[currentLevel]?.skill)
    : "";

  return levelSkill || getSkillDescription(content.skill);
}
