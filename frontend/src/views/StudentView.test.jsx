import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import StudentView from "./StudentView";

describe("StudentView - Mode Focus & Badge de Groupe", () => {
  it("affiche le badge de groupe avec sa structure et ses styles dans student-focused-student-meta en mode focus", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/?classId=1&groupId=20&activityId=100&studentId=10"]}>
        <StudentView />
      </MemoryRouter>
    );

    expect(html).toContain('id="student-focused-student-meta"');
    expect(html).toContain('id="student-focused-group"');
    // Vérifie que le badge contient une pastille de couleur et les styles du badge
    expect(html).toContain("rounded-full");
    expect(html).toContain("background-color:");
    expect(html).toContain("border-color:");
  });
});
