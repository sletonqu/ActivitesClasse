import React from "react";
import { getActiveSkillDescription } from "../utils/activitySkills";

const DEFAULT_INSTRUCTION_CLASSNAME =
  "block min-h-[1.25rem] w-full text-sm text-slate-800 sm:text-base";

const DEFAULT_LEVEL_BUTTON_CLASSNAME =
  "rounded-full px-3 py-1.5 text-sm font-semibold transition";

const getBadgeKey = (badge, index) => badge?.key || `${badge?.label || badge?.content || "badge"}-${index}`;

const getBadgeContent = (badge) => badge?.content ?? badge?.label ?? "";

const ActivityHero = ({
  idPrefix,
  title,
  instruction,
  activityContent,
  showInstruction = true,
  showBadges = true,
  badges = [],
  levels = [],
  currentLevel,
  onSelectLevel,
  getLevelButtonId,
  badgesId,
  levelsId,
  disableAllLevels = false,
  instructionClassName = DEFAULT_INSTRUCTION_CLASSNAME,
}) => {
  const skillDescription = getActiveSkillDescription(activityContent, currentLevel);
  const visibleBadges = showBadges
    ? [
        ...badges,
        ...(skillDescription
          ? [{
              key: "skill",
              content: skillDescription,
              className: "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800",
            }]
          : []),
      ]
    : [];

  return (
    <section
      id={`${idPrefix}-hero`}
      className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 p-[1px]"
    >
      <div className="rounded-2xl bg-white p-3 sm:p-4">
        <div className="w-full min-w-0">
          <h3 id={`${idPrefix}-title`} className="mb-1 block w-full break-words text-lg font-bold text-slate-800 sm:text-2xl">
            {title}
          </h3>
          {showInstruction && instruction && (
            <p id={`${idPrefix}-instructions`} className={instructionClassName}>
              {instruction}
            </p>
          )}

          {visibleBadges.length > 0 && (
            <div id={badgesId || `${idPrefix}-current-settings`} className={`${showInstruction && instruction ? "mt-2" : "mt-1"} flex flex-wrap gap-1.5 sm:gap-2`}>
              {visibleBadges.map((badge, index) => (
                <span
                  key={getBadgeKey(badge, index)}
                  className={badge?.className || "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"}
                >
                  {getBadgeContent(badge)}
                </span>
              ))}
            </div>
          )}
        </div>

        {levels.length > 0 && (
          <div id={levelsId || `${idPrefix}-levels`} className="mt-3 flex flex-wrap justify-center gap-1.5 sm:gap-2">
            {levels.map((level) => {
              const levelKey = level.key;
              const isDisabled = disableAllLevels || Boolean(level.disabled);

              return (
                <button
                  key={levelKey}
                  id={getLevelButtonId ? getLevelButtonId(levelKey) : `${idPrefix}-button-${levelKey}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectLevel?.(levelKey)}
                  className={`${DEFAULT_LEVEL_BUTTON_CLASSNAME} ${
                    currentLevel === levelKey
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  } ${isDisabled ? "disabled:cursor-not-allowed disabled:opacity-60" : ""}`}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ActivityHero;
