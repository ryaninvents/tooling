import { ActionType } from "./migrations.types";

export function actionScore(action: ActionType) {
  switch (action) {
    case ActionType.deleteRecord:
      return 0;
    case ActionType.down:
      return 10;
    case ActionType.up:
      return 20;
    default:
      return 99;
  }
}
