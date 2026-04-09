import React from "react";

const VARIANT_CLASSNAME = {
  validate: "bg-green-500 hover:bg-green-600",
  restart: "bg-slate-700 hover:bg-slate-800",
  warning: "bg-amber-500 hover:bg-amber-600",
  success: "bg-emerald-600 hover:bg-emerald-700",
};

const ActivityIconButton = ({
  id,
  type = "button",
  onClick,
  disabled = false,
  ariaLabel,
  title,
  icon,
  srText,
  variant = "restart",
  className = "",
}) => {
  const toneClassName = VARIANT_CLASSNAME[variant] || VARIANT_CLASSNAME.restart;

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || srText}
      title={title || ariaLabel || srText}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClassName} ${className}`.trim()}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">{srText || ariaLabel || title}</span>
    </button>
  );
};

export default ActivityIconButton;
