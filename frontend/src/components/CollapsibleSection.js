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
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow hover:bg-slate-50"
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
      >
        <span className="text-lg font-bold text-slate-800">{title}</span>
        <span className="text-slate-500 text-xl leading-none">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && (
        <div id={`${id}-content`} className="mt-3">
          {children}
        </div>
      )}
    </section>
  );
};

export default CollapsibleSection;
