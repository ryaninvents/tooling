export enum ActionType {
  up = "up",
  down = "down",
  downUp = "down-up",
  deleteRecord = "delete-record",
  noop = "noop",
}

export interface Action {
  migrationId: string;
  type: ActionType;
}

export interface Logger {
  error(message: string): void;
  info(message: string): void;
  startMigrationAction(migrationId: string, type: ActionType): void;
  completeMigrationAction(migrationId: string, type: ActionType): void;
  failedMigrationAction(
    migrationId: string,
    type: ActionType,
    message: string,
  ): void;
  displayPlan(actions: Array<Action>): void;
  displayState(migrations: Array<MigrationRecord>): void;
}

export enum MigrationState {
  up = "up",
  down = "down",
  failed = "failed",
}

export interface MigrationRecord {
  migrationId: string;
  state: MigrationState;
}

export interface MigrationGenerator {
  generateMigrationFile(slug: string): Promise<{ path: string; id: string }>;
}

export interface MigrationRepl {
  repl(): Promise<void>;
}

export interface MigrationRunner {
  /** Migrate the platform to the latest available version. */
  migrate(): Promise<void>;

  /** Run all "down" migrations to clear the system */
  destroy(): Promise<void>;

  /** Create a list of which tasks would be needed in order to migrate. */
  planMigration(): Promise<Array<Action>>;
  /** Run one "down" migration by ID */
  migrateOneDown(migrationId: string): Promise<void>;
  /** Run one "up" migration by ID */
  migrateOneUp(migrationId: string): Promise<void>;
  /** Re-run one "up" migration by ID */
  rerunOne(migrationId: string): Promise<void>;
  /** Mark a migration as "failed" (incorrectly applied) */
  markFailed(migrationId: string): Promise<void>;
  /** Remove the record of the given migration */
  drop(migrationId: string): Promise<void>;
  /** Update the status for a given migration */
  setMigrationState(migrationId: string, state: MigrationState): Promise<void>;
  /** Get a list of all migrations available in the system */
  listMigrationIds(): Promise<Array<string>>;
  /** Get state of all migrations in the system */
  getAllMigrationRecords(): Promise<Array<MigrationRecord>>;

  isInitialized(): Promise<boolean>;
  initialize(): Promise<void>;

  withLogger(logger: Logger): MigrationRunner;
  readonly logger: Logger;
}

export interface Migration<migrationArgs extends Array<unknown>> {
  down(...args: migrationArgs): Promise<void>;
  up(...args: migrationArgs): Promise<void>;
}

/** Configuration object which describes your database to the tool. */
export interface MigrationRunnerConfig<
  /** Any arguments required for executing the migration; e.g., database connection */
  migrationArgs extends Array<unknown>,
  /** Additional scope provided for REPL usage */
  replScope extends Record<string, unknown> = Record<string, never>,
> {
  /** Tells the tool how to load arguments to pass to the migration */
  getArgs(): Promise<migrationArgs>;
  /** Tells the tool how to generate in-scope REPL variables based on args */
  replScope?: (args: migrationArgs) => Promise<replScope>;

  /** Tells the tool how to load the migration code for a given ID. */
  loadMigration(migrationId: string): Promise<null | Migration<migrationArgs>>;

  /** Should return a list of all possible migrations for this platform. */
  listMigrationIds(): Promise<Array<string>>;

  /**
   * Perform one-time setup such as creating the database user and initializing the tables that
   * hold the migration information.
   */
  initialize(): Promise<void>;

  /** Determine whether the database has been initialized */
  isInitialized(): Promise<boolean>;

  /** Reverse any setup performed in `initialize`. */
  destroy(): Promise<void>;

  /** Tells the tool how to update state for a given migration. */
  setMigrationState(migrationId: string, state: MigrationState): Promise<void>;

  /** Tells the tool how to delete evidence of a migration */
  deleteMigrationRecord(migrationId: string): Promise<void>;

  /** Tells the tool how to load all records of migration runs in the past. */
  getAllMigrationRecords(): Promise<Array<MigrationRecord>>;

  /** Customize logging. */
  logger?: Logger;
}
