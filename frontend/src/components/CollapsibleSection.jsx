import React from "react";

const CollapsibleSection = ({
  id,
  title,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <section id={id} className="w-full mb-4">
      <button
        id={`${id}-toggle`}
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between rounded-xl border px-5 py-4 text-left shadow transition-colors ${
          isOpen
            ? "border-sky-200 bg-sky-50 hover:bg-sky-100"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
      >
        <span className="text-lg font-bold text-slate-800">{title}</span>
        <span className={`text-xl leading-none ${isOpen ? "text-sky-700" : "text-slate-500"}`}>{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div id={`${id}-content`} className="mt-3 rounded-2xl bg-sky-50/60 p-3 ring-1 ring-sky-100">
          {children}
        </div>
      )}
    </section>
  );
};

export default CollapsibleSection;
