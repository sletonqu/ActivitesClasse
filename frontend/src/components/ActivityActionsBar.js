import React from "react";
import ActivityIconButton from "./ActivityIconButton";

const ActivityActionsBar = ({
  id,
  as = "div",
  className = "flex flex-wrap justify-center gap-3",
  actions = [],
}) => {
  const Container = as;
  const fallbackKeyPrefix = id || "activity-actions";

  return (
    <Container id={id} className={className}>
      {actions.map((action, index) => (
        <ActivityIconButton
          key={action.id || `${fallbackKeyPrefix}-${index}`}
          {...action}
        />
      ))}
    </Container>
  );
};

export default ActivityActionsBar;
