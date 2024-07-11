import type { Logger } from "./migrations.types";

export const defaultLogger: Logger = {
  info(message) {
    console.log(message);
  },
  error(message) {
    console.error(message);
  },
  startMigrationAction(migrationId, type) {
    console.log(`Starting to run ${migrationId}, "${type}"...`);
  },
  completeMigrationAction(migrationId, type) {
    console.log(`Successfully finished "${type}" on ${migrationId}.`);
  },
  failedMigrationAction(migrationId, type, error) {
    console.error(
      `Could not complete "${type}" on ${migrationId}. This migration will be in a failed state until it is fixed manually.`,
    );
    console.error(error);
  },
  displayPlan(actions) {
    console.log(
      actions
        .map(
          ({ migrationId, type }) =>
            ` - ${type}: ${JSON.stringify(migrationId)}`,
        )
        .join("\n"),
    );
    console.log(
      `${actions.length} ${actions.length === 1 ? "action" : "actions"}`,
    );
  },
  displayState(migrations) {
    console.log(
      migrations
        .map(
          ({ migrationId, state }) =>
            ` - ${state}: ${JSON.stringify(migrationId)}`,
        )
        .join("\n"),
    );
    console.log(
      `${migrations.length} ${
        migrations.length === 1 ? "migration" : "migrations"
      }`,
    );
  },
};
