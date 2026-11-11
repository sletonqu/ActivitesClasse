import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GroupManagementPanel from "./GroupManagementPanel";

describe("GroupManagementPanel - Gestion des couleurs", () => {
  const dummyGroup = { id: 1, name: "Groupe Alpha", color: "#3b82f6", student_count: 2 };
  const dummyGroups = [
    dummyGroup,
    { id: 2, name: "Groupe Bêta", color: "#10b981", student_count: 1 },
  ];

  it("affiche la pastille de couleur sur les lignes de groupe de la liste", () => {
    const html = renderToStaticMarkup(
      <GroupManagementPanel
        groups={dummyGroups}
        selectedClassId="1"
        showGroupsList={true}
        onSelectGroup={() => {}}
      />
    );

    expect(html).toContain('id="group-row-color-1"');
    expect(html).toContain('id="group-row-color-2"');
    expect(html).toContain("background-color:#3b82f6");
    expect(html).toContain("background-color:#10b981");
  });

  it("affiche la section couleur et le bouton de palette dans groups-panel-students-section", () => {
    const html = renderToStaticMarkup(
      <GroupManagementPanel
        groups={dummyGroups}
        selectedClassId="1"
        selectedGroupId="1"
        selectedGroup={dummyGroup}
        showGroupsList={true}
        groupStudents={[]}
        availableStudents={[]}
      />
    );

    expect(html).toContain('id="groups-panel-students-section"');
    expect(html).toContain('id="groups-panel-color-section"');
    expect(html).toContain('id="groups-panel-open-palette-btn"');
    expect(html).toContain('id="groups-panel-current-color-dot"');
    expect(html).toContain('id="groups-panel-current-color-label"');
    expect(html).toContain("#3b82f6");
    expect(html).toContain('id="groups-panel-selected-group-badge"');
  });

  it("utilise la couleur grise par défaut si le groupe n'a pas de couleur définie", () => {
    const uncoloredGroup = { id: 3, name: "Sans couleur", student_count: 0 };
    const html = renderToStaticMarkup(
      <GroupManagementPanel
        groups={[uncoloredGroup]}
        selectedClassId="1"
        selectedGroupId="3"
        selectedGroup={uncoloredGroup}
        showGroupsList={true}
        groupStudents={[]}
        availableStudents={[]}
      />
    );

    expect(html).toContain('id="groups-panel-current-color-label"');
    expect(html).toContain("#6b7280");
    expect(html).toContain("background-color:#6b7280");
  });
});
