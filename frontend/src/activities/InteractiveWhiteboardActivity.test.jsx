import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as fabric from "fabric";
import InteractiveWhiteboardActivity from "./InteractiveWhiteboardActivity";

describe("InteractiveWhiteboardActivity", () => {
  it("s'initialise correctement avec une prop content vide ({}) conformément au contrat de robustesse", () => {
    const html = renderToStaticMarkup(
      <InteractiveWhiteboardActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="interactive-whiteboard-activity"');
    expect(html).toContain('id="interactive-whiteboard-workspace"');
    expect(html).toContain('id="interactive-whiteboard-tools-group"');
  });

  it("vérifie que l'API Fabric 7 expose les méthodes attendues sur Canvas pour le z-ordering et la gestion de sélection", () => {
    // Vérifier les méthodes canvas de Fabric 7 utilisées par les boutons
    expect(typeof fabric.Canvas.prototype.bringObjectForward).toBe("function");
    expect(typeof fabric.Canvas.prototype.sendObjectBackwards).toBe("function");
    expect(typeof fabric.Canvas.prototype.discardActiveObject).toBe("function");
    expect(typeof fabric.ActiveSelection).toBe("function");

    // Vérifier que obj.clone() renvoie une Promise en Fabric 7
    const rect = new fabric.Rect({ left: 10, top: 20, width: 30, height: 40 });
    const cloneResult = rect.clone();
    expect(cloneResult instanceof Promise).toBe(true);
  });

  it("gère correctement le clonage asynchrone d'une sélection multiple (ActiveSelection)", async () => {
    const rect1 = new fabric.Rect({ left: 10, top: 10, width: 20, height: 20 });
    const rect2 = new fabric.Rect({ left: 50, top: 50, width: 20, height: 20 });
    const selection = new fabric.ActiveSelection([rect1, rect2]);

    const cloned = await selection.clone();
    expect(cloned).toBeDefined();
    expect(cloned.type.toLowerCase()).toBe("activeselection");
    expect(cloned.getObjects().length).toBe(2);
  });

  it("intègre le bouton d'insertion d'image et le champ de fichier masqué avec les identifiants attendus", () => {
    const html = renderToStaticMarkup(
      <InteractiveWhiteboardActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="interactive-whiteboard-insert-image-button"');
    expect(html).toContain('title="Insérer une image"');
    expect(html).toContain('id="interactive-whiteboard-image-input"');
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/*"');
  });

  it("vérifie la conformité de l'API Fabric 7 pour le chargement d'image (fabric.Image.fromURL renvoie une Promise)", () => {
    expect(typeof fabric.Image.fromURL).toBe("function");
    expect(typeof fabric.FabricImage.prototype.scaleToWidth).toBe("function");

    // En Fabric 7, fromURL renvoie systématiquement une Promise
    const promise = fabric.Image.fromURL("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    expect(promise instanceof Promise).toBe(true);
    // On s'assure d'attraper l'erreur d'environnement headless Node si Image HTML n'est pas instanciable
    promise.catch(() => {});
  });

  it("expose des identifiants id conformes et uniques sur tous les boutons de la barre d'outils", () => {
    const html = renderToStaticMarkup(
      <InteractiveWhiteboardActivity student={null} content={{}} onComplete={() => {}} />
    );

    const expectedButtonIds = [
      "interactive-whiteboard-export-json-button",
      "interactive-whiteboard-import-json-button",
      "interactive-whiteboard-export-png-button",
      "interactive-whiteboard-toggle-orientation-button",
      "interactive-whiteboard-zoom-out-button",
      "interactive-whiteboard-zoom-in-button",
      "interactive-whiteboard-pan-button",
      "interactive-whiteboard-draw-button",
      "interactive-whiteboard-ruler-button",
      "interactive-whiteboard-shape-button",
      "interactive-whiteboard-text-button",
      "interactive-whiteboard-erase-button",
      "interactive-whiteboard-insert-image-button",
      "interactive-whiteboard-select-button",
      "interactive-whiteboard-undo-button",
      "interactive-whiteboard-redo-button",
      "interactive-whiteboard-clear-button",
    ];

    expectedButtonIds.forEach((id) => {
      expect(html).toContain(`id="${id}"`);
    });
  });

  it("intègre les conteneurs de prévisualisation du pointeur pour le pinceau/formes et le texte", () => {
    const html = renderToStaticMarkup(
      <InteractiveWhiteboardActivity student={null} content={{}} onComplete={() => {}} />
    );

    expect(html).toContain('id="interactive-whiteboard-brush-preview"');
    expect(html).toContain('id="interactive-whiteboard-text-preview"');
    expect(html).toContain("Bonjour...");
    // Le conteneur ne doit pas comporter de padding ni bordure qui décaleraient l'alignement avec Fabric IText
    expect(html).not.toMatch(/id="interactive-whiteboard-text-preview"[^>]*px-/);
    expect(html).not.toMatch(/id="interactive-whiteboard-text-preview"[^>]*py-/);
    expect(html).toContain("outline");
  });
});
