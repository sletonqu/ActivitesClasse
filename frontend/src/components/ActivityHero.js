import React from "react";

const DEFAULT_INSTRUCTION_CLASSNAME =
  "block min-h-[1.5rem] w-full text-sm text-slate-800 sm:text-base";

const DEFAULT_LEVEL_BUTTON_CLASSNAME =
  "rounded-full px-4 py-2 font-semibold transition";

const getBadgeKey = (badge, index) => badge?.key || `${badge?.label || badge?.content || "badge"}-${index}`;

const getBadgeContent = (badge) => badge?.content ?? badge?.label ?? "";

const ActivityHero = ({
  idPrefix,
  title,
  instruction,
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
  return (
    <section
      id={`${idPrefix}-hero`}
      className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 p-[1px]"
    >
      <div className="rounded-2xl bg-white p-5 sm:p-6">
        <div className="w-full">
          <h3 id={`${idPrefix}-title`} className="mb-2 block w-full text-2xl font-bold text-slate-800">
            {title}
          </h3>
          <p id={`${idPrefix}-instructions`} className={instructionClassName}>
            {instruction}
          </p>

          {badges.length > 0 && (
            <div id={badgesId || `${idPrefix}-current-settings`} className="mt-4 flex flex-wrap gap-2">
              {badges.map((badge, index) => (
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
          <div id={levelsId || `${idPrefix}-levels`} className="mt-5 flex flex-wrap justify-center gap-2">
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
