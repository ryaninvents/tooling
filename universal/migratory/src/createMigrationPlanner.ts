import { sortActions } from "./sortActions";
import type { Action, MigrationRunnerConfig } from "./migrations.types";
import { ActionType, MigrationState } from "./migrations.types";

/** Accepts configuration options and returns a function capable of planning a migration. */
export function createMigrationPlanner<
  migrationArgs extends Array<unknown>,
  replScope extends Record<string, unknown>,
>(
  config: MigrationRunnerConfig<migrationArgs, replScope>,
): () => Promise<Array<Action>> {
  /** Reads current database state and returns a list of actions required to bring the DB
   * up-to-date. */
  return async function planMigration() {
    const allMigrations = new Set(await config.listMigrationIds());
    const currentMigrationRecords = await config.getAllMigrationRecords();
    const migrationActionTypesById = new Map<string, ActionType>();

    // Iterate over all migrations that have been run in the past
    currentMigrationRecords.forEach((record) => {
      if (record.state === MigrationState.failed) {
        migrationActionTypesById.set(
          record.migrationId,
          allMigrations.has(record.migrationId)
            ? ActionType.noop
            : ActionType.deleteRecord,
        );
        return;
      }
      if (allMigrations.has(record.migrationId)) {
        if (record.state === MigrationState.up) {
          migrationActionTypesById.set(record.migrationId, ActionType.noop);
        }
        return;
      }
      // If we get here, then we've found a migration in the database that does not exist in the codebase.
      migrationActionTypesById.set(record.migrationId, ActionType.deleteRecord);
    });

    allMigrations.forEach((migrationId) => {
      if (migrationActionTypesById.has(migrationId)) return;
      migrationActionTypesById.set(migrationId, ActionType.up);
    });

    const actions: Array<Action> = [];

    [...migrationActionTypesById.entries()].forEach(
      ([migrationId, actionType]) => {
        switch (actionType) {
          case ActionType.up:
          case ActionType.down:
          case ActionType.deleteRecord:
            actions.push({ type: actionType, migrationId });
            break;
          case ActionType.downUp:
            actions.push({ type: ActionType.down, migrationId });
            actions.push({ type: ActionType.up, migrationId });
            break;
          default:
            break;
        }
      },
    );

    return sortActions(actions);
  };
}
