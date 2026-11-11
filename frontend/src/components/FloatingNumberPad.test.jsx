import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FloatingNumberPad from "./FloatingNumberPad";

describe("FloatingNumberPad", () => {
  it("ne rend rien quand isOpen est false", () => {
    const html = renderToStaticMarkup(
      <FloatingNumberPad isOpen={false} onKeyPress={() => {}} />
    );
    expect(html).toBe("");
  });

  it("rend le pavé avec z-[100] au-dessus de student-header quand isOpen est true", () => {
    const html = renderToStaticMarkup(
      <FloatingNumberPad
        isOpen={true}
        activeFieldLabel="Numérateur"
        onKeyPress={() => {}}
        onBackspace={() => {}}
        onClose={() => {}}
      />
    );

    expect(html).toContain('id="floating-number-pad-wrapper"');
    expect(html).toContain("z-[100]");
    expect(html).toContain('id="floating-number-pad"');
    expect(html).toContain('id="floating-number-pad-drag-handle"');
    expect(html).toContain("Numérateur");
    expect(html).toContain('id="floating-number-pad-key-1"');
    expect(html).toContain('id="floating-number-pad-close-button"');
  });

  it("gère l'affichage de la virgule si showCommaKey est true", () => {
    const html = renderToStaticMarkup(
      <FloatingNumberPad
        isOpen={true}
        showCommaKey={true}
        onKeyPress={() => {}}
      />
    );

    expect(html).toContain('id="floating-number-pad-key-comma"');
  });

  it("masque les touches passées dans disabledKeys et centre le zéro", () => {
    const html = renderToStaticMarkup(
      <FloatingNumberPad
        isOpen={true}
        disabledKeys={["<", "=", ">"]}
        onKeyPress={() => {}}
      />
    );

    expect(html).not.toContain('id="floating-number-pad-key-lt"');
    expect(html).not.toContain('id="floating-number-pad-key-gt"');
    expect(html).not.toContain('id="floating-number-pad-key-equal"');
    expect(html).toContain('id="floating-number-pad-key-0"');
    expect(html).toContain("col-start-2");
  });
});

