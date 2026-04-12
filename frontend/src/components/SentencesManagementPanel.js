import React from "react";
import AISentenceGeneratorPanel from "./AISentenceGeneratorPanel";
import GeneratedSentencesManagementPanel from "./GeneratedSentencesManagementPanel";

const SentencesManagementPanel = ({ onUseAsActivityTemplate = null, hideTitle = false }) => {
  return (
    <section id="sentences-management-section" className="w-full rounded-xl bg-white p-6 shadow mb-6">
      <div
        id="sentences-management-header"
        className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          {!hideTitle && (
            <h3 id="sentences-management-title" className="mb-2 text-xl font-bold text-slate-800">
              Gestion des phrases
            </h3>
          )}
          <p id="sentences-management-description" className="max-w-3xl text-sm text-slate-500">
            Génère des phrases avec l'IA, puis consulte et supprime les phrases enregistrées en base.
          </p>
        </div>
      </div>

      <div id="sentences-management-ai-wrapper" className="mb-6">
        <AISentenceGeneratorPanel onUseAsActivityTemplate={onUseAsActivityTemplate} />
      </div>

      <div id="sentences-management-generated-wrapper">
        <GeneratedSentencesManagementPanel />
      </div>
    </section>
  );
};

export default SentencesManagementPanel;
