import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WorkshopManagementPanel from "./WorkshopManagementPanel";

describe("WorkshopManagementPanel", () => {
  const dummyClass = { id: 1, name: "Classe CP" };
  const dummyGroups = [
    { id: 10, name: "Groupe Bleu" },
    { id: 20, name: "Groupe Rouge" },
  ];
  const dummyActivities = [
    { id: 100, title: "Conjugaison", status: "Active" },
    { id: 101, title: "Fractions", status: "Active" },
  ];
  const dummyStudents = [
    { id: 1, firstname: "Alice", name: "Dupont", group_id: 10, group_name: "Groupe Bleu" },
    { id: 2, firstname: "Bob", name: "Martin", group_id: 20, group_name: "Groupe Rouge" },
  ];

  it("affiche l'option 'Tous les groupes' dans le sélecteur lorsque des groupes sont présents", () => {
    const html = renderToStaticMarkup(
      <WorkshopManagementPanel
        selectedClass={dummyClass}
        groups={dummyGroups}
        activities={dummyActivities}
        selectedGroupId=""
        selectedActivityId=""
        onSelectGroupId={() => {}}
        onSelectActivityId={() => {}}
      />
    );

    expect(html).toContain('id="workshop-management-group-selector"');
    expect(html).toContain('<option value="ALL">Tous les groupes</option>');
    expect(html).toContain('<option value="10">Groupe Bleu</option>');
    expect(html).toContain('<option value="20">Groupe Rouge</option>');
  });

  it("génère les URLs avec le bon group_id par élève et affiche les badges de groupe quand 'Tous les groupes' est sélectionné", () => {
    const selectedGroupAll = { id: "ALL", name: "Tous les groupes" };
    const html = renderToStaticMarkup(
      <WorkshopManagementPanel
        selectedClass={dummyClass}
        selectedGroup={selectedGroupAll}
        selectedActivity={dummyActivities[0]}
        groupStudents={dummyStudents}
        groups={dummyGroups}
        activities={dummyActivities}
        selectedGroupId="ALL"
        selectedActivityId="100"
        onSelectGroupId={() => {}}
        onSelectActivityId={() => {}}
      />
    );

    expect(html).toContain("Tous les groupes - Conjugaison");
    expect(html).toContain("groupId=10");
    expect(html).toContain("groupId=20");
    expect(html).toContain('id="workshop-management-group-badge-1"');
    expect(html).toContain("Groupe Bleu");
    expect(html).toContain('id="workshop-management-group-badge-2"');
    expect(html).toContain("Groupe Rouge");
  });

  it("n'affiche pas les badges de groupe lorsqu'un groupe individuel est sélectionné", () => {
    const selectedGroupSingle = dummyGroups[0];
    const singleGroupStudents = [dummyStudents[0]];
    const html = renderToStaticMarkup(
      <WorkshopManagementPanel
        selectedClass={dummyClass}
        selectedGroup={selectedGroupSingle}
        selectedActivity={dummyActivities[0]}
        groupStudents={singleGroupStudents}
        groups={dummyGroups}
        activities={dummyActivities}
        selectedGroupId="10"
        selectedActivityId="100"
        onSelectGroupId={() => {}}
        onSelectActivityId={() => {}}
      />
    );

    expect(html).toContain("Groupe Bleu - Conjugaison");
    expect(html).toContain("groupId=10");
    expect(html).not.toContain('id="workshop-management-group-badge-1"');
  });

  it("affiche le message adapté lorsque aucun élève n'est trouvé avec 'Tous les groupes'", () => {
    const selectedGroupAll = { id: "ALL", name: "Tous les groupes" };
    const html = renderToStaticMarkup(
      <WorkshopManagementPanel
        selectedClass={dummyClass}
        selectedGroup={selectedGroupAll}
        selectedActivity={dummyActivities[0]}
        groupStudents={[]}
        groups={dummyGroups}
        activities={dummyActivities}
        selectedGroupId="ALL"
        selectedActivityId="100"
        onSelectGroupId={() => {}}
        onSelectActivityId={() => {}}
      />
    );

    expect(html).toContain("Aucun élève trouvé dans les groupes de cette classe.");
  });
});

