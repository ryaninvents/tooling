import { createMigrationPlanner } from "./createMigrationPlanner";
import {
  Action,
  ActionType,
  Logger,
  MigrationRunner,
  MigrationRunnerConfig,
  MigrationState,
} from "./migrations.types";
import { defaultLogger } from "./defaultLogger";

export function createRunner<
  migrationArgs extends Array<unknown>,
  replScope extends Record<string, unknown>,
>(config: MigrationRunnerConfig<migrationArgs, replScope>): MigrationRunner {
  let argPromise: Promise<migrationArgs> | null = null;
  const logger = config.logger ?? defaultLogger;

  async function getArgs(): Promise<migrationArgs> {
    if (argPromise) return argPromise;
    argPromise = config.getArgs();
    return argPromise;
  }

  const planMigration = createMigrationPlanner(config);

  async function setMigrationState(
    migrationId: string,
    state: MigrationState,
  ): Promise<void> {
    if (!(await config.isInitialized())) {
      await config.initialize();
    }
    return config.setMigrationState(migrationId, state);
  }

  async function migrateOneDown(migrationId: string) {
    if (!(await config.isInitialized())) {
      await config.initialize();
    }
    logger.startMigrationAction(migrationId, ActionType.down);
    const migration = await config.loadMigration(migrationId);
    const args = await getArgs();
    try {
      if (!migration) {
        throw new Error(`Migration "${migrationId}" not found`);
      }
      await migration.down(...args);
      logger.completeMigrationAction(migrationId, ActionType.down);
      await setMigrationState(migrationId, MigrationState.down);
    } catch (migrationError) {
      await setMigrationState(migrationId, MigrationState.failed);
      logger.failedMigrationAction(
        migrationId,
        ActionType.down,
        migrationError,
      );
      throw migrationError;
    }
  }

  async function migrateOneUp(migrationId: string) {
    if (!(await config.isInitialized())) {
      await config.initialize();
    }
    logger.startMigrationAction(migrationId, ActionType.up);
    const migration = await config.loadMigration(migrationId);
    const args = await getArgs();
    try {
      if (!migration) {
        throw new Error(`Migration "${migrationId}" not found`);
      }
      await migration.up(...args);
      logger.completeMigrationAction(migrationId, ActionType.up);
      await setMigrationState(migrationId, MigrationState.up);
    } catch (migrationError) {
      await setMigrationState(migrationId, MigrationState.failed);
      logger.failedMigrationAction(migrationId, ActionType.up, migrationError);
      throw migrationError;
    }
  }

  async function runPlan(plan: Array<Action>): Promise<void> {
    if (!(await config.isInitialized())) {
      await config.initialize();
    }
    if (plan.length === 0) return;

    for (const action of plan) {
      switch (action.type) {
        case ActionType.deleteRecord:
          await config.deleteMigrationRecord(action.migrationId);
          break;
        case ActionType.down:
          await migrateOneDown(action.migrationId);
          break;
        case ActionType.up:
          await migrateOneUp(action.migrationId);
          break;
        default:
          throw new Error(
            `Cannot handle action type "${action.type}" on migration "${action.migrationId}"`,
          );
      }
    }
  }

  async function migrate(): Promise<void> {
    if (!(await config.isInitialized())) {
      await config.initialize();
    }
    const plan = await planMigration();

    await runPlan(plan);
  }

  async function migrateAllDown(): Promise<void> {
    if (!(await config.isInitialized())) {
      await config.initialize();
    }
    const plan: Array<Action> = [];
    const state = await config.getAllMigrationRecords();
    for (let i = state.length - 1; i >= 0; i--) {
      const record = state[i];
      if (record.state === MigrationState.down) continue;
      plan.push({ type: ActionType.down, migrationId: record.migrationId });
    }
    await runPlan(plan);
  }

  return {
    planMigration,
    migrate,
    migrateOneDown,
    migrateOneUp,
    async listMigrationIds() {
      if (!(await config.isInitialized())) {
        await config.initialize();
      }
      return config.listMigrationIds();
    },
    isInitialized: () => config.isInitialized(),
    initialize: () => config.initialize(),
    async destroy() {
      await migrateAllDown();
      await config.destroy();
    },
    async markFailed(migrationId) {
      if (!(await config.isInitialized())) {
        await config.initialize();
      }
      return setMigrationState(migrationId, MigrationState.failed);
    },
    async drop(migrationId) {
      if (!(await config.isInitialized())) {
        await config.initialize();
      }
      return setMigrationState(migrationId, MigrationState.down);
    },
    setMigrationState,
    async rerunOne(migrationId) {
      if (!(await config.isInitialized())) {
        await config.initialize();
      }
      const plan: Array<Action> = [
        { type: ActionType.down, migrationId },
        { type: ActionType.up, migrationId },
      ];
      await runPlan(plan);
    },
    async getAllMigrationRecords() {
      if (!(await config.isInitialized())) {
        await config.initialize();
      }
      return config.getAllMigrationRecords();
    },
    withLogger(logger: Logger) {
      return createRunner({ ...config, logger });
    },
    get logger() {
      return logger;
    },
  };
}
