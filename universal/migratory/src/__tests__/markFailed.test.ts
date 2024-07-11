import { describe, it, expect, beforeEach } from "@jest/globals";
import { createRunner, MigrationRunner, MigrationState } from "..";

describe("markFailed", () => {
  let db: Record<string, boolean> = {};
  let migrationsTable: Record<string, MigrationState> = {};
  let runner: MigrationRunner;

  beforeEach(() => {
    db = {};
    migrationsTable = {};
    runner = createRunner<[], Record<string, never>>({
      listMigrationIds: async () => ["1", "2", "3"],
      loadMigration: async (id) => ({
        async up() {
          db[id] = true;
        },
        async down() {
          db[id] = false;
        },
      }),
      getArgs: async () => [],
      async deleteMigrationRecord(id) {
        delete migrationsTable[id];
      },
      async getAllMigrationRecords() {
        return Object.entries(migrationsTable).map(([migrationId, state]) => ({
          migrationId,
          state,
        }));
      },
      async initialize() {},
      async setMigrationState(migrationId, state) {
        migrationsTable[migrationId] = state;
      },
      async isInitialized() {
        return true;
      },
      async destroy() {},
    });
  });

  it("should mark a migration as failed", async () => {
    await runner.markFailed("2");
    expect(migrationsTable["2"]).toBe(MigrationState.failed);
  });

  it("should not update the state of a failed migration", async () => {
    await runner.migrate();
    expect(db["2"]).toBe(true);
    await runner.markFailed("2");
    expect(migrationsTable["2"]).toBe(MigrationState.failed);
    await runner.migrate();
    expect(migrationsTable["2"]).toBe(MigrationState.failed);

    // simulate manual resolution
    delete db["2"];
    await runner.drop("2");
    expect(migrationsTable["2"]).toBe(MigrationState.down);

    console.log(migrationsTable, await runner.planMigration());
    await runner.migrate();
    expect(db["2"]).toBe(true);
    expect(migrationsTable["2"]).toBe(MigrationState.up);
  });
});
