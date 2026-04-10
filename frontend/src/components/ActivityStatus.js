import React from "react";

function clampPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

const ActivityStatus = ({
  id,
  progressBarId,
  progressPercent = 0,
  label = "Progression de l'activité",
}) => {
  const safeProgressPercent = clampPercent(progressPercent);

  return (
    <section
      id={id}
      className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3"
      aria-label={label}
    >
      <span className="sr-only">{label} : {safeProgressPercent}%</span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:h-2.5">
        <div
          id={progressBarId}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeProgressPercent}
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
          style={{ width: `${safeProgressPercent}%` }}
        />
      </div>
    </section>
  );
};

export default ActivityStatus;
