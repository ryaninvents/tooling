import type { Action } from "./migrations.types";

import { actionScore } from "./actionScore";

/** Sort the actions for appropriate execution order. */
export function sortActions(actions: Array<Action>) {
  return [...actions].sort((a, b) => {
    {
      const actionDiff = actionScore(a.type) - actionScore(b.type);
      if (actionDiff !== 0) return actionDiff;
    }
    if (a.type === "down") return b.migrationId.localeCompare(a.migrationId);
    return a.migrationId.localeCompare(b.migrationId);
  });
}
