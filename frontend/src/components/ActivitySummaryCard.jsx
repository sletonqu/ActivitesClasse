import React from "react";

const CONFETTI_PARTICLES = Array.from({ length: 32 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${-((index * 11) % 36)}px`,
  drift: `${(index % 2 === 0 ? 1 : -1) * (24 + ((index * 17) % 96))}px`,
  burstDrift: `${(index % 2 === 0 ? 1 : -1) * (8 + ((index * 13) % 34))}px`,
  rotation: `${((index * 83) % 720) - 360}deg`,
  delay: `${(index % 8) * 45}ms`,
  color: `hsl(${(index * 47) % 360} 85% 55%)`,
  isRound: index % 4 === 0,
}));

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
  valueClassName = "",
  footerClassName = "",
}) => {
  const palette = SUMMARY_TONE_CLASSNAMES[tone] || SUMMARY_TONE_CLASSNAMES.success;

  return (
    <section id={id} className={`relative overflow-hidden rounded-2xl border p-3 shadow-sm sm:p-4 ${palette.wrapper} ${className}`}>
      {score === 20 && scoreMax === 20 ? (
        <div
          id={id ? `${id}-confetti` : undefined}
          className="activity-summary-confetti"
          aria-hidden="true"
        >
          {CONFETTI_PARTICLES.map((particle) => (
            <span
              key={particle.id}
              className={`activity-summary-confetti-piece${particle.isRound ? " activity-summary-confetti-piece-round" : ""}`}
              style={{
                "--confetti-left": particle.left,
                "--confetti-top": particle.top,
                "--confetti-drift": particle.drift,
                "--confetti-burst-drift": particle.burstDrift,
                "--confetti-rotation": particle.rotation,
                "--confetti-delay": particle.delay,
                "--confetti-color": particle.color,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold sm:text-xl">{title}</p>
          {message ? <p className={`text-sm ${palette.message}`}>{message}</p> : null}
        </div>

        {score !== null && score !== undefined ? (
          <div className={`rounded-2xl border px-3 py-2.5 text-center shadow-sm ${palette.card}`}>
            <p className={`text-xs uppercase tracking-wide ${palette.label}`}>{scoreLabel}</p>
            <p className={`text-2xl font-bold ${valueClassName}`}>{score} / {scoreMax}</p>
          </div>
        ) : null}
      </div>

      {footer ? (
        <div className={`relative z-10 mt-3 rounded-xl border p-3 text-sm shadow-sm ${palette.card} ${footerClassName}`}>{footer}</div>
      ) : null}

      {stats.length > 0 ? (
        <div className={`relative z-10 mt-3 grid gap-2 ${stats.length >= 3 ? "sm:grid-cols-3" : stats.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
          {stats.map((stat, index) => (
            <div key={stat.key || `${stat.label}-${index}`} className={`rounded-xl border p-3 ${palette.card}`}>
              <div className={`text-xs uppercase tracking-wide ${palette.label}`}>{stat.label}</div>
              <div className={`text-xl font-bold sm:text-2xl ${valueClassName}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ActivitySummaryCard;
