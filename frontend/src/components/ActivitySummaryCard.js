import React from "react";

const SUMMARY_TONE_CLASSNAMES = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
    message: "text-emerald-800",
    label: "text-emerald-700",
    card: "border-emerald-100 bg-white",
  },
  error: {
    wrapper: "border-rose-200 bg-rose-50 text-rose-900",
    message: "text-rose-800",
    label: "text-rose-700",
    card: "border-rose-100 bg-white",
  },
};

const ActivitySummaryCard = ({
  id,
  title = "Activité terminée",
  message,
  score,
  scoreLabel = "Score",
  scoreMax = 20,
  tone = "success",
  stats = [],
  footer,
  className = "",
}) => {
  const palette = SUMMARY_TONE_CLASSNAMES[tone] || SUMMARY_TONE_CLASSNAMES.success;

  return (
    <section id={id} className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${palette.wrapper} ${className}`}>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold sm:text-xl">{title}</p>
          {message ? <p className={`text-sm ${palette.message}`}>{message}</p> : null}
        </div>

        {score !== null && score !== undefined ? (
          <div className={`rounded-2xl border px-3 py-2.5 text-center shadow-sm ${palette.card}`}>
            <p className={`text-xs uppercase tracking-wide ${palette.label}`}>{scoreLabel}</p>
            <p className="text-2xl font-bold">{score} / {scoreMax}</p>
          </div>
        ) : null}
      </div>

      {footer ? (
        <div className={`mt-3 rounded-xl border p-3 text-sm shadow-sm ${palette.card}`}>{footer}</div>
      ) : null}

      {stats.length > 0 ? (
        <div className={`mt-3 grid gap-2 ${stats.length >= 3 ? "sm:grid-cols-3" : stats.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
          {stats.map((stat, index) => (
            <div key={stat.key || `${stat.label}-${index}`} className={`rounded-xl border p-3 ${palette.card}`}>
              <div className={`text-xs uppercase tracking-wide ${palette.label}`}>{stat.label}</div>
              <div className="text-xl font-bold sm:text-2xl">{stat.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ActivitySummaryCard;
