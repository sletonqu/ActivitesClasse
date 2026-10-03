import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ActivitySummaryCard from "./ActivitySummaryCard";

describe("ActivitySummaryCard", () => {
  it("affiche les confettis pour un score parfait de 20 sur 20", () => {
    const html = renderToStaticMarkup(
      <ActivitySummaryCard id="test-summary" score={20} />
    );

    expect(html).toContain('id="test-summary-confetti"');
    expect(html).toContain("activity-summary-confetti-piece");
  });

  it("n'affiche pas les confettis lorsque le score est inférieur à 20", () => {
    const html = renderToStaticMarkup(
      <ActivitySummaryCard id="test-summary" score={19} />
    );

    expect(html).not.toContain('id="test-summary-confetti"');
  });

  it("n'affiche pas les confettis lorsque le score maximal n'est pas 20", () => {
    const html = renderToStaticMarkup(
      <ActivitySummaryCard id="test-summary" score={20} scoreMax={25} />
    );

    expect(html).not.toContain('id="test-summary-confetti"');
  });
});
